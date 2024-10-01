package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/sessions"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

var store = sessions.NewCookieStore([]byte("hello-world"))

type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type Product struct {
	ID    int     `json:"id"`
	Name  string  `json:"pro_name"`
	Price float64 `json:"pro_price"`
	Desc  string  `json:"pro_desc"`
}

func connectDB() *sql.DB {
	db, err := sql.Open("mysql", "root@tcp(127.0.0.1:3306)/api_pachara")
	if err != nil {
		log.Fatal(err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to MySQL!")
	return db
}

// เข้ารหัสรหัสผ่าน
func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// ตรวจสอบรหัสผ่าน
func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Handler สำหรับการสมัครสมาชิก
func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user User
	json.NewDecoder(r.Body).Decode(&user)

	hashedPassword, err := hashPassword(user.Password)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", user.Username, hashedPassword, user.Role)
	if err != nil {
		http.Error(w, "Error saving user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "User registered successfully")
}

// Handler สำหรับการเข้าสู่ระบบ (Login) พร้อมการจัดการ session
func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var user User
	json.NewDecoder(r.Body).Decode(&user)

	var storedPassword string
	err := db.QueryRow("SELECT id, password FROM users WHERE username = ?", user.Username).Scan(&user.ID, &storedPassword)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	if !checkPasswordHash(user.Password, storedPassword) {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// สร้าง session เมื่อ login สำเร็จ
	session, _ := store.Get(r, "session-id")
	session.Values["user_id"] = user.ID
	session.Save(r, w)

	// ส่งผลลัพธ์เป็น JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"username": user.Username})
}

func checkLoginHandler(w http.ResponseWriter, r *http.Request) {
	// Get the session from the request
	session, err := store.Get(r, "session-id")
	if err != nil {
		http.Error(w, "Failed to get session", http.StatusInternalServerError)
		return
	}

	// Check if the user is logged in by checking for "user_id" in session values
	userID, ok := session.Values["user_id"]
	if !ok {
		http.Error(w, "Not logged in", http.StatusUnauthorized)
		return
	}

	// Query to retrieve the user's username based on their user ID
	var user User
	err = db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&user.Username)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
		} else {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// Respond with 200 OK and the user information in JSON format
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": user,
	})
}

// Handler สำหรับการออกจากระบบ (Logout)
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	// รับ session
	session, err := store.Get(r, "session-id")
	if err != nil {
		http.Error(w, "Failed to get session", http.StatusInternalServerError)
		return
	}

	// ลบค่าใน session โดยการตั้ง MaxAge ให้เป็น -1
	session.Options.MaxAge = -1
	if err := session.Save(r, w); err != nil {
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	// ตอบกลับด้วย JSON บอกว่าล็อกเอาท์สำเร็จ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logout successful",
	})
}

func getProductByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ดึงค่า id จาก URL params
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var product Product
	err := db.QueryRow("SELECT id, pro_name, pro_price, pro_desc FROM products WHERE id = ?", id).Scan(&product.ID, &product.Name, &product.Price, &product.Desc)
	if err != nil {
		http.Error(w, "Product not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Query("SELECT id, pro_name, pro_price, pro_desc FROM products")
	if err != nil {
		http.Error(w, "Error fetching products", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var products []Product
	for rows.Next() {
		var product Product
		if err := rows.Scan(&product.ID, &product.Name, &product.Price, &product.Desc); err != nil {
			http.Error(w, "Error scanning product", http.StatusInternalServerError)
			return
		}
		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, "Error with rows", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(products)
}

func addProductHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare("INSERT INTO products (pro_name, pro_price, pro_desc) VALUES (?, ?, ?)")
	if err != nil {
		http.Error(w, "Error preparing query", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	if product.Name == "" || product.Price == 0 || product.Desc == "" {
		http.Error(w, "Invalid product data", http.StatusBadRequest)
		return
	}

	_, err = stmt.Exec(product.Name, product.Price, product.Desc)
	if err != nil {
		log.Printf("Error inserting product: %v", err)
		http.Error(w, "Error inserting product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Product inserted successfully"))
}

func updateProductHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get the ID from URL params
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		http.Error(w, "Error decoding JSON", http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare("UPDATE products SET pro_name = ?, pro_price = ?, pro_desc = ? WHERE id = ?")
	if err != nil {
		http.Error(w, "Error preparing query", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(product.Name, product.Price, product.Desc, id)
	if err != nil {
		http.Error(w, "Error updating product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Product updated successfully")
}

func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// ดึงค่า id จาก URL params
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare("DELETE FROM products WHERE id = ?")
	if err != nil {
		http.Error(w, "Error preparing query", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(id)
	if err != nil {
		http.Error(w, "Error deleting product", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Product deleted successfully")
}

func enableCors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// อนุญาต origin จาก localhost:5173
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true") // สำหรับอนุญาตการส่ง credentials (เช่น cookies)

		// ถ้าเป็นการ request แบบ OPTIONS ให้ตอบกลับโดยตรง
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	db = connectDB()
	defer db.Close()

	// corsHandler := handlers.CORS(
	// 	handlers.AllowedOrigins([]string{"http://localhost:3000"}),
	// 	handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE"}),
	// 	handlers.AllowedHeaders([]string{"Content-Type"}),
	// 	handlers.AllowCredentials(),
	// )

	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/logout", logoutHandler)
	http.HandleFunc("/check-login", checkLoginHandler)
	http.HandleFunc("/product/", getProductByIDHandler)
	http.HandleFunc("/products", productsHandler)
	http.HandleFunc("/product/add", addProductHandler)       // เพิ่มสินค้า
	http.HandleFunc("/product/update", updateProductHandler) // แก้ไขสินค้า
	http.HandleFunc("/product/delete", deleteProductHandler) // ลบสินค้า

	fmt.Println("Server running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", enableCors(http.DefaultServeMux)))
}
