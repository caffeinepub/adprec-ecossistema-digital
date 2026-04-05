import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Tithe {
    status: TitheStatus;
    memberId: Principal;
    receiptImage?: ExternalBlob;
    date: bigint;
    amount: number;
}
export interface Event {
    title: string;
    description: string;
    posterImage?: ExternalBlob;
    eventDate: bigint;
}
export interface CantinaRecord {
    memberId: Principal;
    paymentStatus: PaymentStatus;
    date: bigint;
    item: string;
    pixQrCode: string;
    amount: number;
}
export interface Escala {
    ministerio: string;
    volunteerName: string;
    date: bigint;
    volunteerId: Principal;
    confirmed: boolean;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface Prayer {
    request: string;
    createdAt: bigint;
    memberName: string;
    visibility: PrayerVisibility;
}
export interface Member {
    id: Principal;
    status: MemberStatus;
    todaysBirthday: boolean;
    entryDate?: bigint;
    birthDate?: bigint;
    cargo: Cargo;
    lgpd: boolean;
    name: string;
    phone: string;
    photo?: ExternalBlob;
}
export interface Project {
    name: string;
    progressPhoto?: ExternalBlob;
    targetAmount: number;
    currentAmount: number;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum Cargo {
    membro = "membro",
    admin = "admin",
    congregado = "congregado"
}
export enum MemberStatus {
    active = "active",
    pending = "pending"
}
export enum PaymentStatus {
    owing = "owing",
    paid = "paid"
}
export enum PrayerVisibility {
    publicPrayer = "publicPrayer",
    pastorOnly = "pastorOnly"
}
export enum TitheStatus {
    pending = "pending",
    confirmed = "confirmed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCantina(record: CantinaRecord): Promise<void>;
    addEvent(event: Event): Promise<void>;
    addOrUpdateCantinaRecord(recordId: string, record: CantinaRecord): Promise<void>;
    addOrUpdateTithe(recordId: string, record: Tithe): Promise<void>;
    addPrayer(prayer: Prayer): Promise<void>;
    addProject(project: Project): Promise<void>;
    addTithe(titheId: string, tithe: Tithe): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    confirmTithe(recordId: string): Promise<void>;
    contributionProject(projectName: string, contribution: number): Promise<number>;
    deleteTithe(titheId: string): Promise<void>;
    editScale(jornada: Escala): Promise<void>;
    getAllEvents(): Promise<Array<Event>>;
    getAllMembers(): Promise<Array<Member>>;
    getAllOverdueCantinaRecords(): Promise<Array<CantinaRecord>>;
    getAllTithesByAdmin(): Promise<Array<Tithe>>;
    getCallerUserRole(): Promise<UserRole>;
    getCantinaOwingRecordsForMember(memberId: Principal): Promise<Array<CantinaRecord>>;
    getCantinaRecordById(recordId: string): Promise<CantinaRecord | null>;
    getEventByTitle(title: string): Promise<Event | null>;
    getMember(id: Principal): Promise<Member | null>;
    getMemberScales(memberId: Principal): Promise<Array<Escala>>;
    getMembersWithOldTithes(): Promise<Array<Principal>>;
    getOwnCantinaRecords(): Promise<Array<CantinaRecord>>;
    getOwnTithes(): Promise<Array<Tithe>>;
    getPrayersByVisibility(visibility: PrayerVisibility): Promise<Array<Prayer>>;
    getProjects(): Promise<Array<Project>>;
    getTitheById(id: string): Promise<Tithe | null>;
    getTodaysBirthdays(): Promise<Array<Member>>;
    getUpcomingBirthdays(): Promise<Array<[Member, bigint]>>;
    getUserPrayers(name: string): Promise<Array<Prayer>>;
    isAdminAssigned(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    selfInitializeAsFirstAdmin(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    markRecordPaid(recordId: string): Promise<void>;
    removeEvent(title: string): Promise<void>;
    requestApproval(): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    updateTithe(titheId: string, amount: number): Promise<void>;
    upsertMember(member: Member): Promise<void>;
}
