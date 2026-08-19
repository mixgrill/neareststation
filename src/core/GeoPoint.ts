export class GeoPoint{
    public readonly longitude:number;
    public readonly latitude:number;
    constructor(longitude:number,latitude:number){
        this.longitude = longitude;
        this.latitude = latitude;
    }
}
export class GeoPointNumberPair{
    public readonly geoPoint:GeoPoint;
    public readonly num: number;
    constructor(geoPoint:GeoPoint, num:number){
        this.geoPoint = geoPoint;
        this.num = num;
    }
}
export class Line{
    public readonly p1: GeoPoint;
    public readonly p2: GeoPoint;
    constructor(p1:GeoPoint, p2:GeoPoint){
        this.p1 = p1;
        this.p2 = p2;
    }
}
export class LineString{
    public readonly coordinates:ReadonlyArray<GeoPoint>;
    getLines():Line[]{
        const ret:Line[] = [];
        for (let i = 0; i<this.coordinates.length -1; i++){
            const l = new Line(this.coordinates[i], this.coordinates[i+1]);
            ret.push(l);
        }
        return ret;
    }
    constructor (coordinates:ReadonlyArray<GeoPoint>){
        this.coordinates = coordinates;
    }
}
export class Vector3 {
    public readonly x:number;
    public readonly y:number;
    public readonly z:number;
    constructor(
        x: number,
        y: number,
        z: number
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
export interface GeoCalculator{
    distance(p1:GeoPoint,p2:GeoPoint):number;
    nearestPoint(p:GeoPoint, line:Line):GeoPointNumberPair;
    nearestPointLineString(p:GeoPoint,lineString:LineString):GeoPointNumberPair;
    moveLatitude(p: GeoPoint, distance: number): GeoPoint;
    moveLongitude(p: GeoPoint, distance: number): GeoPoint;
}
export function distanceHaversine(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6371000;

    const phi1 = p1.latitude * Math.PI / 180;
    const phi2 = p2.latitude * Math.PI / 180;
    const deltaPhi = (p2.latitude - p1.latitude) * Math.PI / 180;
    const deltaRambda = (p2.longitude - p1.longitude) * Math.PI / 180;

    const a =
        Math.sin(deltaPhi / 2) ** 2 +
        Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaRambda / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * ややいい加減な距離計算機
 */
export class BogoGeoCalulator implements GeoCalculator{
    moveLatitude(p: GeoPoint, distance: number): GeoPoint {
        const R = 6371000;

        const deltaLatitude =
            distance / R * 180 / Math.PI;

        return new GeoPoint(
            p.longitude,
            p.latitude + deltaLatitude
        );
    }
    moveLongitude(p: GeoPoint, distance: number): GeoPoint {
        const R = 6371000;

        const latitude = p.latitude * Math.PI / 180;

        const deltaLongitude =
            distance / (R * Math.cos(latitude))
            * 180 / Math.PI;

        return new GeoPoint(
            p.longitude + deltaLongitude,
            p.latitude
        );
    }
    distance(p1: GeoPoint, p2: GeoPoint): number {
        return distanceHaversine(p1,p2);
    }
    nearestPoint(p: GeoPoint, line: Line): GeoPointNumberPair {
        const p1distance = this.distance(p, line.p1);
        const p2distance = this.distance(p, line.p2);
        if (p1distance < p2distance){
            return new GeoPointNumberPair(line.p1, p1distance);
        }else{
            return new GeoPointNumberPair(line.p2, p2distance)
        }
    }
    nearestPointLineString(p: GeoPoint, lineString: LineString): GeoPointNumberPair {
        let minDistance = +Infinity;
        let geo = lineString.coordinates[0];
        lineString.coordinates.forEach(pc=>{
            const distanceCandidate =  this.distance(pc, p);
            if (distanceCandidate < minDistance){
                minDistance = distanceCandidate;
                geo = pc;
            }
        })
        return new GeoPointNumberPair(geo,minDistance);
    }
}
export const bogoGeoCalulator: GeoCalculator = new BogoGeoCalulator();

export class HaversineGeoCalculator implements GeoCalculator{
    moveLatitude(p: GeoPoint, distance: number): GeoPoint {
        throw new Error("Method not implemented.");
    }
    moveLongitude(p: GeoPoint, distance: number): GeoPoint {
        throw new Error("Method not implemented.");
    }
    private toVector3(p: GeoPoint): Vector3 {
        const lat = p.latitude * Math.PI / 180;
        const lon = p.longitude * Math.PI / 180;

        return new Vector3(
            Math.cos(lat) * Math.cos(lon),
            Math.cos(lat) * Math.sin(lon),
            Math.sin(lat)
        );
    }
    private cross(a: Vector3, b: Vector3): Vector3 {
        return new Vector3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    private dot(a: Vector3, b: Vector3): number {
        return a.x * b.x +
            a.y * b.y +
            a.z * b.z;
    }
    private normalize(v: Vector3): Vector3 {
        const length = Math.sqrt(
            v.x * v.x +
            v.y * v.y +
            v.z * v.z
        );

        return new Vector3(
            v.x / length,
            v.y / length,
            v.z / length
        );
    }
    private isOnArc(
        a: Vector3,
        b: Vector3,
        q: Vector3
    ): boolean {

        const ab = this.angle(a, b);
        const aq = this.angle(a, q);
        const qb = this.angle(q, b);

        const epsilon = 1e-10;

        return Math.abs((aq + qb) - ab) < epsilon;
    }
    private toGeoPoint(v: Vector3): GeoPoint {
        const latitude =
            Math.asin(v.z) * 180 / Math.PI;

        const longitude =
            Math.atan2(v.y, v.x) * 180 / Math.PI;

        return new GeoPoint(longitude, latitude);
    }
    private angle(a: Vector3, b: Vector3): number {
        const d = Math.max(
            -1,
            Math.min(1, this.dot(a, b))
        );

        return Math.acos(d);
    }
    distance(p1: GeoPoint, p2: GeoPoint): number {
        const R = 6371000;

        const phi1 = p1.latitude * Math.PI / 180;
        const phi2 = p2.latitude * Math.PI / 180;
        const deltaPhi = (p2.latitude - p1.latitude) * Math.PI / 180;
        const deltaRambda = (p2.longitude - p1.longitude) * Math.PI / 180;

        const a =
            Math.sin(deltaPhi / 2) ** 2 +
            Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin(deltaRambda / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
    nearestPoint(p: GeoPoint, line: Line): GeoPointNumberPair {
        const pv = this.toVector3(p);
        const a = this.toVector3(line.p1);
        const b = this.toVector3(line.p2);

        // A-Bを通る大円の法線
        const normal = this.cross(a, b);
        const normalLength2 = this.dot(normal, normal);

        const p1distance = this.distance(p, line.p1);
        const p2distance = this.distance(p, line.p2);

        // AとBが同一点の場合
        if (normalLength2 < 1e-20) {
            return p1distance <= p2distance
                ? new GeoPointNumberPair(line.p1, p1distance)
                : new GeoPointNumberPair(line.p2, p2distance);
        }

        // Pを大円の平面へ射影
        const scale = this.dot(pv, normal) / normalLength2;

        const projection = new Vector3(
            pv.x - scale * normal.x,
            pv.y - scale * normal.y,
            pv.z - scale * normal.z
        );

        const q1 = this.normalize(projection);
        const q2 = new Vector3(
            -q1.x,
            -q1.y,
            -q1.z
        );

        // 大円上の2候補のうち、
        // A-Bの短い弧上にあるものを採用
        if (this.isOnArc(a, b, q1)) {
            const q1geo = this.toGeoPoint(q1);
            return new GeoPointNumberPair(q1geo,this.distance(q1geo,p));
        }

        if (this.isOnArc(a, b, q2)) {
            const q2geo = this.toGeoPoint(q2);
            return new GeoPointNumberPair(q2geo,this.distance(q2geo,p));
        }

        // 射影点が弧の外なら端点のどちらか
        return p1distance <= p2distance
            ? new GeoPointNumberPair(line.p1,p1distance)
            : new GeoPointNumberPair(line.p2,p2distance);
    }
    nearestPointLineString(p: GeoPoint, lineString: LineString): GeoPointNumberPair {
        let distance = Infinity;
        let ret:GeoPointNumberPair = new GeoPointNumberPair(lineString.coordinates[0],Infinity);
        lineString.getLines().forEach((l)=>{
            const pointCandidate = this.nearestPoint(p, l);
            const newDistanceCandidate = this.distance(p, pointCandidate.geoPoint);
            if (newDistanceCandidate < distance){
                distance = newDistanceCandidate;
                ret = pointCandidate;
            }
        })
        return ret;
    }
}
