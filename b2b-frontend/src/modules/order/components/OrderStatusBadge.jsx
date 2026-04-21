import { ORDER_STATUS } from "../../../utils/constants";

const statusConfig = {
  [ORDER_STATUS.PENDING]: { label: 'Order Received', color: '#f59e0b', bg: '#fef3c7' },
  [ORDER_STATUS.CONFIRMED]: { label: 'Confirmed', color: '#8b5cf6', bg: '#f3e8ff' },
  [ORDER_STATUS.PROCESSING]: { label: 'Preparing', color: '#3b82f6', bg: '#dbeafe' },
  [ORDER_STATUS.PACKED]: { label: 'Packed', color: '#06b6d4', bg: '#ecfeff' },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: { label: 'Shipping', color: '#f97316', bg: '#ffedd5' },
  [ORDER_STATUS.DELIVERED]: { label: 'Completed', color: '#10b981', bg: '#d1fae5' },
  [ORDER_STATUS.CANCELLED]: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
  [ORDER_STATUS.FAILED]: { label: 'Failed', color: '#ef4444', bg: '#fee2e2' },
};

const OrderStatusBadge = ({ status }) => {
  const config = statusConfig[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };

  return (
    <span style={{ 
      padding: '0.25rem 0.75rem', 
      borderRadius: '9999px', 
      fontSize: '0.75rem', 
      fontWeight: '700',
      color: config.color,
      backgroundColor: config.bg,
      textTransform: 'uppercase',
      display: 'inline-block'
    }}>
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
