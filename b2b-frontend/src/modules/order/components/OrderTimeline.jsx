const OrderTimeline = ({ timeline }) => {
  return (
    <ul>
      {timeline.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ul>
  );
};

export default OrderTimeline;