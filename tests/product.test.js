const request = require("supertest");
const app = require("../index"); // Import your Express app
const mongoose = require("mongoose");
const Product = require("../models/products");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");
const config = require("../config");

describe("Product Routes", () => {
  let  userToken,adminId;

  beforeAll(async () => {
    //create a admin user for testing
    const admin = new User({
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: 'admin123',
      role: 1, // Role 1 = Admin
    });
    adminUser = await admin.save();

    // Simulate admin sign-in to get token
    const res = await request(app)
      .post('/api/user/signin')
      .send({
        email: 'admin@gmail.com',
        password: 'admin123',
      });

    userToken = res.body.token;
    adminId = res.body.user._id;
  });



  it("should create a product as an admin", async () => {
    const testImagePath = path.join(__dirname, "assets", "testImage.png");
    console.log(testImagePath)
    // Mock the product data
    const productData = {
      name: "Test Product",
      description: "A test product",
      stock: 10,
      price: 100,
      category: "TestCategory",
    };

    const res = await request(app)
      .post("/api/product/create")
      .set("Authorization", `Bearer ${userToken}`)
      .field("name", productData.name)
      .field("description", productData.description)
      .field("stock", productData.stock)
      .field("price", productData.price)
      .field("category", productData.category)
      .attach("photo", testImagePath); // Add image

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Product created successfully!");
    expect(res.body.product).toMatchObject({
      name: productData.name,
      description: productData.description,
      stock: productData.stock,
      price: productData.price,
    });
  });


  afterAll(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});
    // Cleanup test database and close connection
    await mongoose.connection.close();
  });
});