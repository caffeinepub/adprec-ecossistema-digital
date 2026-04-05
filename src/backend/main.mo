import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import UserApproval "user-approval/approval";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

actor {
  // Include authentication system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Include approval system
  let approvalState = UserApproval.initState(accessControlState);

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    UserApproval.requestApproval(approvalState, caller);
  };

  // Returns true if at least one admin has been assigned
  public query func isAdminAssigned() : async Bool {
    accessControlState.adminAssigned;
  };

  // Allows the first user to self-assign as admin (only works if no admin exists yet)
  public shared ({ caller }) func selfInitializeAsFirstAdmin() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (accessControlState.adminAssigned) { return false };
    // No admin yet — promote caller to admin
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    // Also mark as approved in the approval system
    UserApproval.setApproval(approvalState, caller, #approved);
    true;
  };



  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // Include persistent blob storage
  include MixinStorage();

  //////////////////////
  // DATA MODELS
  //////////////////////

  // MEMBERS (Membros)

  public type MemberStatus = {
    #active;
    #pending;
  };

  public type Cargo = {
    #congregado;
    #membro;
    #admin;
  };

  public type Member = {
    id : Principal;
    name : Text;
    photo : ?Storage.ExternalBlob;
    cargo : Cargo;
    birthDate : ?Int;
    entryDate : ?Int;
    phone : Text;
    lgpd : Bool;
    status : MemberStatus;
    todaysBirthday : Bool;
  };

  module Member {
    public func compare(member1 : Member, member2 : Member) : Order.Order {
      Text.compare(member1.name, member2.name);
    };
  };

  // CALENDAR EVENTS

  public type Event = {
    title : Text;
    eventDate : Int;
    posterImage : ?Storage.ExternalBlob;
    description : Text;
  };

  // DIZIMOS (Tithes)

  public type TitheStatus = {
    #pending;
    #confirmed;
  };

  public type Tithe = {
    memberId : Principal;
    amount : Float;
    date : Int;
    receiptImage : ?Storage.ExternalBlob;
    status : TitheStatus;
  };

  // CANTINA

  public type PaymentStatus = {
    #owing;
    #paid;
  };

  public type CantinaRecord = {
    memberId : Principal;
    item : Text;
    amount : Float;
    date : Int;
    paymentStatus : PaymentStatus;
    pixQrCode : Text;
  };

  module CantinaRecord {
    public func compare(record1 : CantinaRecord, record2 : CantinaRecord) : Order.Order {
      Int.compare(record1.date, record2.date);
    };
  };

  // PROJECTS

  public type Project = {
    name : Text;
    targetAmount : Float;
    currentAmount : Float;
    progressPhoto : ?Storage.ExternalBlob;
  };

  // ESCALAS (Volunteer Schedule)

  public type Escala = {
    date : Int;
    ministerio : Text;
    volunteerName : Text;
    volunteerId : Principal;
    confirmed : Bool;
  };

  module Escala {
    public func compare(escala1 : Escala, escala2 : Escala) : Order.Order {
      Int.compare(escala1.date, escala2.date);
    };
  };

  // ORACAO (Prayer Wall)

  public type PrayerVisibility = {
    #publicPrayer;
    #pastorOnly;
  };

  public type Prayer = {
    memberName : Text;
    request : Text;
    visibility : PrayerVisibility;
    createdAt : Int;
  };

  //////////////////////
  // DATA STORAGE
  //////////////////////

  // Declare persistent data fields
  let members = Map.empty<Principal, Member>();
  let events = Map.empty<Text, Event>();
  let tithes = Map.empty<Text, Tithe>();
  let cantinaRecords = Map.empty<Text, CantinaRecord>();
  let projects = Map.empty<Text, Project>();
  let escalas = Map.empty<Text, Escala>();
  let prayers = Map.empty<Text, Prayer>();

  //////////////////////
  // HELPER FUNCTIONS
  //////////////////////

  // Apply LGPD privacy rules to member data
  func applyLgpdPrivacy(member : Member, caller : Principal) : Member {
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let isOwner = caller == member.id;
    
    // If admin or owner, return full data
    if (isAdmin or isOwner) {
      return member;
    };
    
    // If lgpd=false, hide birthDate and entryDate from other members
    if (not member.lgpd) {
      return {
        member with
        birthDate = null;
        entryDate = null;
      };
    };
    
    member;
  };

  //////////////////////
  // MEMBERS (Membros)
  //////////////////////

  public query ({ caller }) func getMember(id : Principal) : async ?Member {
    if (not (AccessControl.isAdmin(accessControlState, caller) or caller == id)) {
      Runtime.trap("Unauthorized access to member data");
    };
    switch (members.get(id)) {
      case (null) { null };
      case (?member) {
        ?applyLgpdPrivacy(member, caller);
      };
    };
  };

  public query ({ caller }) func getAllMembers() : async [Member] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    members.values().toArray().sort().map(func(m) { applyLgpdPrivacy(m, caller) });
  };

  public shared ({ caller }) func upsertMember(member : Member) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller) or caller == member.id)) {
      Runtime.trap("Unauthorized access to member data");
    };
    members.add(member.id, member);
  };

  public query ({ caller }) func getTodaysBirthdays() : async [Member] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view birthdays");
    };
    members.values().toArray().filter(func(m) { m.todaysBirthday }).map(func(m) { applyLgpdPrivacy(m, caller) });
  };

  public query ({ caller }) func getUpcomingBirthdays() : async [(Member, Int)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view upcoming birthdays");
    };
    let now = Time.now();
    let daysRight = 48 * 60 * 60 * 1000000000; // 48 hours in nanoseconds

    // Helper function to calculate days until birthday
    let daysToBirthday = func(member : Member) : Int {
      switch (member.birthDate) {
        case (null) { 365 };
        case (?birthDate) {
          let today = now % (365 * 24 * 60 * 60 * 1000000000);
          let birthdayMod = (birthDate + 24 * 60 * 60 * 1000000000) % (365 * 24 * 60 * 60 * 1000000000);
          ((birthdayMod + 365 * 24 * 60 * 60 * 1000000000) - today) % (365 * 24 * 60 * 60 * 1000000000);
        };
      };
    };

    // Map members to (Member, Int) tuples representing days until birthday
    let memberValues = members.values().toArray();
    let memberTuples = memberValues.map(func(m) { (m, daysToBirthday(m)) });

    // Filter eligible birthdays within next 48 hours (except today)
    let upcomingFiltered = memberTuples.filter(
      func(entry) {
        let (member, daysUntilBirthday) = entry;
        member.birthDate != null and member.birthDate != ?0 and daysUntilBirthday > 0 and daysUntilBirthday <= daysRight;
      }
    );

    // Sort based on daysToBirthday
    let sorted = upcomingFiltered.sort(
      func(entry1, entry2) {
        Int.compare(entry1.1, entry2.1);
      }
    );
    sorted;
  };

  //////////////////////
  // CALENDAR (Eventos)
  //////////////////////

  public query ({ caller }) func getEventByTitle(title : Text) : async ?Event {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access event data");
    };
    events.get(title);
  };

  public query ({ caller }) func getAllEvents() : async [Event] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view events");
    };
    events.values().toArray();
  };

  public shared ({ caller }) func addEvent(event : Event) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add events");
    };
    events.add(event.title, event);
  };

  public shared ({ caller }) func removeEvent(title : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove events");
    };
    events.remove(title);
  };

  //////////////////////
  // DIZIMOS (Tithes)
  //////////////////////

  func onlyTitheOwnerOrAdmin(caller : Principal, record : Tithe) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or (caller == record.memberId);
  };

  func onlyCantinaOwnerOrAdmin(caller : Principal, record : CantinaRecord) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or (caller == record.memberId);
  };

  public query ({ caller }) func getTitheById(id : Text) : async ?Tithe {
    switch (tithes.get(id)) {
      case (null) { null };
      case (?record) {
        if (onlyTitheOwnerOrAdmin(caller, record)) {
          ?record;
        } else {
          Runtime.trap("Unauthorized access");
        };
      };
    };
  };

  public query ({ caller }) func getAllTithesByAdmin() : async [Tithe] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin role required");
    };
    tithes.values().toArray();
  };

  public query ({ caller }) func getOwnTithes() : async [Tithe] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their tithes");
    };
    // Fetch tithes where memberId equals caller
    tithes.entries().toArray().filter(
      func(entry) {
        let t = entry.1;
        t.memberId == caller;
      }
    ).map(
      func(entry) { entry.1 }
    );
  };

  public query ({ caller }) func getMembersWithOldTithes() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view old tithes");
    };
    let now = Time.now();
    let days30Millis = 30 * 24 * 60 * 60 * 1000000000;
    let memberIdsList = List.empty<Principal>();
    tithes.values().toArray().forEach(
      func(tith) {
        if (now - tith.date > days30Millis) {
          memberIdsList.add(tith.memberId);
        };
      }
    );
    memberIdsList.toArray();
  };

  public shared ({ caller }) func addTithe(titheId : Text, tithe : Tithe) : async () {
    if (not (onlyTitheOwnerOrAdmin(caller, tithe))) {
      Runtime.trap("Unauthorized: Only tithe owner or admins can add tithe");
    };
    tithes.add(titheId, tithe);
  };

  public shared ({ caller }) func deleteTithe(titheId : Text) : async () {
    switch (tithes.get(titheId)) {
      case (null) {
        Runtime.trap("No record found with id " # titheId);
      };
      case (?record) {
        if (onlyTitheOwnerOrAdmin(caller, record)) {
          tithes.remove(titheId);
        } else {
          Runtime.trap("Unauthorized access");
        };
      };
    };
  };

  public shared ({ caller }) func confirmTithe(recordId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can confirm tithes");
    };
    switch (tithes.get(recordId)) {
      case (null) {
        Runtime.trap("No tithe found with id " # recordId);
      };
      case (?tithe) {
        let updatedTithe = { tithe with status = #confirmed };
        tithes.add(recordId, updatedTithe);
      };
    };
  };

  public shared ({ caller }) func updateTithe(titheId : Text, amount : Float) : async () {
    switch (tithes.get(titheId)) {
      case (null) {
        Runtime.trap("No record found with id " # titheId);
      };
      case (?record) {
        if (onlyTitheOwnerOrAdmin(caller, record)) {
          let updatedTithe = {
            record with
            amount;
          };
          tithes.add(titheId, updatedTithe);
        } else {
          Runtime.trap("Unauthorized access");
        };
      };
    };
  };

  public shared ({ caller }) func addOrUpdateTithe(recordId : Text, record : Tithe) : async () {
    if (not (onlyTitheOwnerOrAdmin(caller, record))) {
      Runtime.trap("Unauthorized: Only the tithe owner can update this record");
    };
    tithes.add(recordId, record);
  };

  //////////////////////
  // CANTINA
  //////////////////////

  public query ({ caller }) func getCantinaRecordById(recordId : Text) : async ?CantinaRecord {
    switch (cantinaRecords.get(recordId)) {
      case (null) { null };
      case (?record) {
        if (onlyCantinaOwnerOrAdmin(caller, record)) {
          ?record;
        } else {
          Runtime.trap("Unauthorized access");
        };
      };
    };
  };

  public query ({ caller }) func getAllOverdueCantinaRecords() : async [CantinaRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view overdue cantina records");
    };
    let overdueRecordsList = List.empty<CantinaRecord>();
    let now = Time.now();
    let days30Millis = 30 * 24 * 60 * 60 * 1000000000;
    cantinaRecords.entries().toArray().forEach(
      func(entry) {
        let record = entry.1;
        if (now - record.date > days30Millis and record.paymentStatus == #owing) {
          overdueRecordsList.add(record);
        };
      }
    );
    overdueRecordsList.toArray();
  };

  public query ({ caller }) func getOwnCantinaRecords() : async [CantinaRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their own cantina records");
    };
    let ownRecordsList = List.empty<CantinaRecord>();
    cantinaRecords.entries().toArray().forEach(
      func(entry) {
        let record = entry.1;
        if (record.memberId == caller) { ownRecordsList.add(record) };
      }
    );
    ownRecordsList.toArray().sort();
  };

  public query ({ caller }) func getCantinaOwingRecordsForMember(memberId : Principal) : async [CantinaRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view cantina owing for other members");
    };
    let owingRecordsList = List.empty<CantinaRecord>();
    cantinaRecords.entries().toArray().forEach(
      func(entry) {
        let record = entry.1;
        if (record.memberId == memberId and record.paymentStatus == #owing) {
          owingRecordsList.add(record);
        };
      }
    );
    owingRecordsList.toArray().sort();
  };

  public shared ({ caller }) func addOrUpdateCantinaRecord(recordId : Text, record : CantinaRecord) : async () {
    if (not (onlyCantinaOwnerOrAdmin(caller, record))) {
      Runtime.trap("Unauthorized: Only the owner can update this record");
    };
    cantinaRecords.add(recordId, record);
  };

  public shared ({ caller }) func markRecordPaid(recordId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Admin role required");
    };
    switch (cantinaRecords.get(recordId)) {
      case (null) {
        Runtime.trap("No record found with id " # recordId);
      };
      case (?record) {
        let updatedRecord = {
          record with
          paymentStatus = #paid;
        };
        cantinaRecords.add(recordId, updatedRecord);
      };
    };
  };

  public shared ({ caller }) func addCantina(record : CantinaRecord) : async () {
    // Allow admin to add records for any member, or users to add their own
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin) or caller == record.memberId)) {
      Runtime.trap("Unauthorized: Only admins or the member can add cantina records");
    };
    cantinaRecords.add(record.item, record);
  };

  //////////////////////
  // PROJECTS
  //////////////////////

  public query ({ caller }) func getProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view projects");
    };
    projects.values().toArray();
  };

  public shared ({ caller }) func addProject(project : Project) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add projects");
    };
    projects.add(project.name, project);
  };

  public shared ({ caller }) func contributionProject(projectName : Text, contribution : Float) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update project contributions");
    };
    switch (projects.get(projectName)) {
      case (null) {
        Runtime.trap("No record found with id " # projectName);
      };
      case (?project) {
        let newCurrent = project.currentAmount + contribution;
        let updatedProject = {
          project with
          currentAmount = newCurrent;
        };
        projects.add(projectName, updatedProject);
        newCurrent;
      };
    };
  };

  //////////////////////
  // ESCALAS (Volunteer Schedule)
  //////////////////////

  public query ({ caller }) func getMemberScales(memberId : Principal) : async [Escala] {
    // Members can only see their own scales; admins can see all
    if (not (AccessControl.isAdmin(accessControlState, caller) or caller == memberId)) {
      Runtime.trap("Unauthorized: Can only view your own scales");
    };
    escalas.values().toArray().filter(func(e) { e.volunteerId == memberId });
  };

  public shared ({ caller }) func editScale(jornada : Escala) : async () {
    // Check if scale already exists
    switch (escalas.get(jornada.ministerio)) {
      case (null) {
        // Creating new scale - only admins can do this
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can create new scales");
        };
      };
      case (?existingScale) {
        // Editing existing scale - admin or the volunteer can edit
        if (not (AccessControl.isAdmin(accessControlState, caller) or caller == existingScale.volunteerId)) {
          Runtime.trap("Unauthorized: Only the volunteer or admins can edit this scale");
        };
      };
    };
    escalas.add(jornada.ministerio, jornada);
  };

  //////////////////////
  // ORACAO (Prayer/Prayer Wall)
  //////////////////////

  public shared ({ caller }) func addPrayer(prayer : Prayer) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add prayers");
    };
    prayers.add(prayer.memberName, prayer);
  };

  public query ({ caller }) func getPrayersByVisibility(visibility : PrayerVisibility) : async [Prayer] {
    // Public prayers visible to all authenticated users
    // PastorOnly prayers visible only to admins
    switch (visibility) {
      case (#publicPrayer) {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
          Runtime.trap("Unauthorized: Only users can view prayers");
        };
      };
      case (#pastorOnly) {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
          Runtime.trap("Unauthorized: Only admins can view pastor-only prayers");
        };
      };
    };
    let prayersArray = prayers.values().toArray();
    prayersArray.filter(func(prayer) { prayer.visibility == visibility });
  };

  public query ({ caller }) func getUserPrayers(name : Text) : async [Prayer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view prayers");
    };
    prayers.values().toArray().filter(func(prayer) { prayer.memberName == name });
  };
};
