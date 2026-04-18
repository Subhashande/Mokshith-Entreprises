import { useNotification } from "../hooks/useNotification";
import NotificationItem from "../components/NotificationItem";

const NotificationPage = () => {
  const { notifications, loading, error, markAsRead } = useNotification();

  if (loading) return <p>Loading notifications...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Notifications</h1>

      {notifications.length === 0 && <p>No notifications</p>}

      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRead={markAsRead}
        />
      ))}
    </div>
  );
};

export default NotificationPage;