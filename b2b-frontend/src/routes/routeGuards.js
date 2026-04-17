import storage from "../services/storage";

export const isAuthenticated = () => {
  return !!storage.get("user");
};

export const requireAuth = (Component) => {
  return (props) => {
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return null;
    }
    return <Component {...props} />;
  };
};