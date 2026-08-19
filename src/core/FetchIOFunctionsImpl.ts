import type { IOFunctions } from "./IOFunctions";

export class FetchIOFunctionsImpl implements IOFunctions {
    private readonly url: string;
    private usedSize: bigint;
    private allocatedSize: bigint;

    // LRUキャッシュ本体
    private readonly data: Map<bigint, Uint8Array> = new Map();

    // 現在 Fetch 処理中の Promise を保持するマップ (重複 Fetch 防止用)
    private readonly pendingFetches: Map<bigint, Promise<Uint8Array>> = new Map();

    private readonly blockSize: number;
    private readonly lRUSize: number;

    public constructor(
        url: string,
        initialUsedSize: bigint,
        initialAllocatedSize: bigint,
        blockSize: number = 0x1000, // 4KB
        lRUSize: number = 1024,
    ) {
        this.url = url;
        this.usedSize = initialUsedSize;
        this.allocatedSize = initialAllocatedSize;
        this.blockSize = blockSize;
        this.lRUSize = lRUSize;
    }

    /**
     * 指定された領域のデータを読み込みます。
     * 複数ブロックに跨がる場合は全対象ブロックを Promise.all で並列 Fetch します。
     */
    public async read(address: bigint, size: number, dest: Uint8Array): Promise<number> {
        if (size <= 0) return 0;
        if (address + BigInt(size) > this.allocatedSize) {
            throw new Error("割り当て領域を超えたアドレスへのアクセスです");
        }

        const bgBlockSize = BigInt(this.blockSize);
        const endAddress = address + BigInt(size) - 1n;

        // 1. 必要なブロックの開始・終了インデックスを算出
        const startBlockIndex = address / bgBlockSize;
        const endBlockIndex = endAddress / bgBlockSize;

        // 2. 対象となる全ブロックのインデックス配列を作成
        const blockIndices: bigint[] = [];
        for (let idx = startBlockIndex; idx <= endBlockIndex; idx++) {
            blockIndices.push(idx);
        }

        // 3. 全対象ブロックを並列取得 (キャッシュヒット時は即時レスポンス、未取得時は並列 Fetch)
        const blocks = await Promise.all(
            blockIndices.map(blockIndex => this.getBlock(blockIndex))
        );

        // 4. 取得したブロックから dest バッファへ順次コピー
        let bytesRead = 0;
        let currentAddr = address;

        for (let i = 0; i < blocks.length; i++) {
            const blockData = blocks[i];
            const offsetInBlock = Number(currentAddr % bgBlockSize);
            const bytesToCopy = Math.min(this.blockSize - offsetInBlock, size - bytesRead);

            dest.set(
                blockData.subarray(offsetInBlock, offsetInBlock + bytesToCopy),
                bytesRead
            );

            currentAddr += BigInt(bytesToCopy);
            bytesRead += bytesToCopy;
        }

        return bytesRead;
    }

    /**
     * 単一ブロックを取得します。
     * キャッシュ・進行中リクエスト・新規 Fetch の優先順で処理します。
     */
    private async getBlock(blockIndex: bigint): Promise<Uint8Array> {
        // --- 1. キャッシュヒット ---
        if (this.data.has(blockIndex)) {
            const cachedBlock = this.data.get(blockIndex)!;
            // LRU 順序の更新 ($O(1)$)
            this.data.delete(blockIndex);
            this.data.set(blockIndex, cachedBlock);
            return cachedBlock;
        }

        // --- 2. 既に同じブロックを Fetch 中であれば、その Promise を再利用 (重複 Fetch 防止) ---
        if (this.pendingFetches.has(blockIndex)) {
            return await this.pendingFetches.get(blockIndex)!;
        }

        // --- 3. 新規 Fetch リクエストを作成 ---
        const fetchPromise = (async () => {
            try {
                const startByte = blockIndex * BigInt(this.blockSize);
                const endByte = startByte + BigInt(this.blockSize) - 1n;

                const response = await fetch(this.url, {
                    headers: {
                        Range: `bytes=${startByte}-${endByte}`
                    }
                });

                if (!response.ok && response.status !== 206) {
                    throw new Error(`ブロックの取得に失敗しました: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const fetchedBlock = new Uint8Array(arrayBuffer);

                // キャッシュへ格納
                this.data.set(blockIndex, fetchedBlock);

                // キャッシュ溢れ時の最古要素削除 ($O(1)$)
                if (this.data.size > this.lRUSize) {
                    const oldestBlockIndex = this.data.keys().next().value;
                    if (oldestBlockIndex !== undefined) {
                        this.data.delete(oldestBlockIndex);
                    }
                }

                return fetchedBlock;
            } finally {
                // 成功・失敗にかかわらず処理終了後に pending から削除
                this.pendingFetches.delete(blockIndex);
            }
        })();

        // 実行中の Promise を登録
        this.pendingFetches.set(blockIndex, fetchPromise);

        return await fetchPromise;
    }

    // --- 以下、省略メソッド ---
    getUsedSize(): bigint { return this.usedSize; }
    getAllocatedSize(): bigint { return this.allocatedSize; }
    isAllocated(address: bigint, size: number): boolean {
        return address + BigInt(size) <= this.allocatedSize;
    }
    getFree(): bigint { throw new Error("Read-only"); }
    getRemainSize(align: number): bigint {
        const alignedUsedSize = (this.usedSize & (BigInt(align) - 1n)) > 0n
            ? (this.usedSize + BigInt(align)) - (this.usedSize & BigInt(align - 1))
            : this.usedSize;
        return this.allocatedSize - alignedUsedSize;
    }
    write(): Promise<number> { throw new Error("FetchIOFunctionsImpl は読み取り専用です"); }
    expand(): Promise<void> { throw new Error("FetchIOFunctionsImpl は読み取り専用です"); }
    shrink(): Promise<void> { throw new Error("FetchIOFunctionsImpl は読み取り専用です"); }
    sync(): Promise<void> { return Promise.resolve(); }
}