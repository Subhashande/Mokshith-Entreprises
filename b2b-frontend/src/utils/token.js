export const clearAuth = () => { 
  localStorage.removeItem("token"); 
  localStorage.removeItem("user"); 
}; 
