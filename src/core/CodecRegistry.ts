import type { BBlock } from "./BBlock";
import { BBlockCodec } from "./BBlockCodec";
import type { BinaryCodec } from "./BinaryCodec";
import type { BoundingRectangle } from "./BoundingRectangle";
import { BoundingRectangleCodec } from "./BoundingRectangleCodec";
import type { BRecord } from "./BRecord";
import { BRecordCodec } from "./BRecordCodec";
import type { ContentSpecifier } from "./ContentSpecifier";
import { ContentSpecifierCodec } from "./ContentSpecifierCodec";
import type { GlobalHeader } from "./GlobalHeader";
import { GlobalHeaderCodec } from "./GlobalHeaderCodec";
import { LRecord } from "./LRecord";
import { LRecordCodec } from "./LRecordCodec";


// モジュール読み込み時に 1 度だけ評価・生成され、以降は同じインスタンスが再利用される（モジュールレベル・シングルトン）
export const boundingRectangleCodec: BinaryCodec<BoundingRectangle> = new BoundingRectangleCodec();
export const globalHeaderCodec: BinaryCodec<GlobalHeader> = new GlobalHeaderCodec();
export const contentSpecifierCodec: BinaryCodec<ContentSpecifier> = new ContentSpecifierCodec()
export const bRecordCodec: BinaryCodec<BRecord> = new BRecordCodec();
export const lRecordCodec: BinaryCodec<LRecord> = new LRecordCodec();
export const bBlockCodec: BinaryCodec<BBlock> = new BBlockCodec();
