const SearchResults = ({ results }) => {
  if (!results.length) return <p>No results found</p>;

  return (
    <div>
      {results.map((item) => (
        <div key={item.id} style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
          <p>{item.name}</p>
          <small>₹{item.price}</small>
        </div>
      ))}
    </div>
  );
};

export default SearchResults;