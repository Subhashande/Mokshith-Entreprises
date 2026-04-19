export const orderAggregationPipeline = () => [
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    },
  },
];