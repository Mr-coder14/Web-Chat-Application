// User.js
class User {
    constructor() {
      this.userid = '';
      this.name = '';
      this.profile = '';
      this.isActive = false;
      this.lastSeen = null;
    }
  
    setUserid(userid) {
      this.userid = userid;
    }
  
    setName(name) {
      this.name = name;
    }
  
    setProfile(profile) {
      this.profile = profile;
    }
  
    setActive(active) {
      this.isActive = active;
    }
  
    setLastSeen(lastSeen) {
      this.lastSeen = lastSeen;
    }
  }
  
  export default User;