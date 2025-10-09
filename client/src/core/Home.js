import React, { useState, useEffect } from "react";
import Base from "./Base";
import Card from "./Card";
import { getProducts } from "./helper/coreapicalls";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(false);

  const showProducts = () => {
    getProducts()
      .then((data) => {
        setProducts(data);
        console.log("data", data)
        setError(false); // Reset error state if data is fetched successfully
      })
      .catch(() => {
        setError(true); // Set error state if the API call fails
      });
  };

  useEffect(() => {
    showProducts();
  }, []);

  return (
    <Base title="Personal Merchandise App | Buy Trendy T-Shirts Online" 
    description="Shop the latest T-shirts online with Personal Merchandise App. Secure payments, fast delivery, and a user-friendly shopping experience for men and women."
    >
      <div className="container">
        <h1 className="mb-4 text-center">All Products</h1>
        {error && (
          <div className="alert alert-danger">
            <h4>Failed to load products. Please try again later.</h4>
          </div>
        )}
      </div>
      <div className="row">
        {!error &&
          products.map((product, index) => (
            <div key={index}>
              <Card product={product} />
            </div>
          ))}
      </div>
    </Base>
  );
};

export default Home;
