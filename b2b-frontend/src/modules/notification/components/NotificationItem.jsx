const NotificationItem = ({ notification, onRead }) => {
  return (
    <div
      style={{
        padding: "10px",
        marginBottom: "5px",
        background: notification.read ? "#f5f5f5" : "#e6f7ff",
        cursor: "pointer",
      }}
      onClick={() => onRead(notification.id)}
    >
      <p>{notification.message}</p>
      <small>{new Date(notification.createdAt).toLocaleString()}</small>
    </div>
  );
};

export default NotificationItem;