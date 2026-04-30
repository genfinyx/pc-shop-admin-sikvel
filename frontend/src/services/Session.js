export const Session = {
  setUser(userData) {
    console.log('Saving user data:', userData);
    localStorage.setItem('user', JSON.stringify(userData));
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getUserId() {
    const user = this.getUser();
    return user?.id || null;
  },

  getUserName() {
    const user = this.getUser();
    return user?.firstName || user?.username || 'Admin';
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('activeTable');
  },

  setActiveTable(table) {
    localStorage.setItem('activeTable', table);
  },

  getActiveTable() {
    return 'main';
  }
};