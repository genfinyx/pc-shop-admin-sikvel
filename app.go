package main

import (
    "context"
    "crypto/sha256"
    "database/sql"
    "fmt"
    "strings"
    "math/rand"
    "time"
    "strconv"
    "os"
    "encoding/base64"

    "github.com/xuri/excelize/v2"
    _ "github.com/go-sql-driver/mysql"
)

type App struct {
	ctx context.Context
	db  *sql.DB
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.connectDB()
}

func (a *App) connectDB() {
	dsn := "root:root@tcp(127.0.0.1:3306)/pc_shop_db?charset=utf8mb4&parseTime=true&loc=Local"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return
	}

	if err := db.Ping(); err != nil {
		return
	}

	a.db = db
}

func (a *App) CheckDB() bool {
	if a.db == nil {
		return false
	}
	return a.db.Ping() == nil
}

func (a *App) GetTables() ([]string, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not connected")
	}

	rows, err := a.db.Query("SHOW TABLES")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return nil, err
		}
		tables = append(tables, table)
	}
	return tables, nil
}

// GetTableData получает данные таблицы с пагинацией и поиском
func (a *App) GetTableData(table string, page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    if search != "" {
            switch table {
            case "order":
                return a.SearchOrders(page, search, perPage)
            case "order_item":
                return a.SearchOrderItems(page, search, perPage)
            case "cart_item":
                return a.SearchCartItems(page, search, perPage)
            case "review":
                return a.SearchReviews(page, search, perPage)
            case "wishlist":
                return a.SearchWishlist(page, search, perPage)
            case "invoice_in":
                return a.SearchInvoiceIn(page, search, perPage)
            case "invoice_out":
                return a.SearchInvoiceOut(page, search, perPage)
            case "receipt":
                return a.SearchReceipt(page, search, perPage)
            }
    }

    escapedTable := "`" + table + "`"
    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    // Получаем список колонок для таблицы
    colRows, err := a.db.Query("SHOW COLUMNS FROM " + escapedTable)
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    var searchableColumns []string

    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)

        if strings.Contains(typ, "varchar") || strings.Contains(typ, "text") || strings.Contains(typ, "char") {
            searchableColumns = append(searchableColumns, field)
        }
    }

    if search != "" {
        var conditions []string
        var args []interface{}

        for _, col := range searchableColumns {
            conditions = append(conditions, col+" LIKE ?")
            args = append(args, "%"+search+"%")
        }

        if len(conditions) > 0 {
            countSQL := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE %s", escapedTable, strings.Join(conditions, " OR "))
            err = a.db.QueryRow(countSQL, args...).Scan(&total)
            if err != nil {
                return nil, err
            }

            sqlStr := fmt.Sprintf("SELECT * FROM %s WHERE %s LIMIT ? OFFSET ?", escapedTable, strings.Join(conditions, " OR "))
            args = append(args, perPage, offset)

            result, err := a.db.Query(sqlStr, args...)
            if err != nil {
                return nil, err
            }
            defer result.Close()

            rows = a.scanRows(result)
        }
    } else {
        err := a.db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", escapedTable)).Scan(&total)
        if err != nil {
            return nil, err
        }

        result, err := a.db.Query(fmt.Sprintf("SELECT * FROM %s LIMIT ? OFFSET ?", escapedTable), perPage, offset)
        if err != nil {
            return nil, err
        }
        defer result.Close()

        rows = a.scanRows(result)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// CreateUser создаёт нового пользователя
func (a *App) CreateUser(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Хешируем пароль
    password := data["password_hash"].(string)
    hashedPassword := fmt.Sprintf("%x", sha256.Sum256([]byte(password)))

    // Преобразуем пустые строки в NULL
    phone := data["phone"]
    if phone == "" {
        phone = nil
    }

    middleName := data["middle_name"]
    if middleName == "" {
        middleName = nil
    }

    query := `INSERT INTO User (
        username, password_hash, email, phone, first_name, last_name, middle_name, role, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["username"],
        hashedPassword,
        data["email"],
        phone,
        data["first_name"],
        data["last_name"],
        middleName,
        data["role"],
        data["is_active"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "User created successfully",
    }, nil
}

// DeleteUser удаляет пользователя по ID
func (a *App) DeleteUser(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Проверяем, не пытается ли пользователь удалить самого себя
    // ID текущего пользователя нужно передавать из сессии
    // TODO: получить ID текущего пользователя из контекста

    _, err := a.db.Exec("DELETE FROM User WHERE idUser = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "User deleted successfully",
    }, nil
}

func (a *App) scanRows(rows *sql.Rows) []map[string]interface{} {
	var result []map[string]interface{}
	cols, _ := rows.Columns()

	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		rows.Scan(columnPointers...)

		row := make(map[string]interface{})
		for i, colName := range cols {
			val := columns[i]
			if b, ok := val.([]byte); ok {
				row[colName] = string(b)
			} else {
				row[colName] = val
			}
		}
		result = append(result, row)
	}
	return result
}

// GetRecord возвращает запись по ID
func (a *App) GetRecord(table string, id int) (map[string]interface{}, error) {
    var data map[string]interface{}
    // TODO: запрос к БД
    return data, nil
}

// GetFormFields возвращает поля для формы
func (a *App) GetFormFields(table string) ([]map[string]interface{}, error) {
    var fields []map[string]interface{}
    // TODO: получить структуру таблицы
    return fields, nil
}

// CreateRecord создаёт новую запись
func (a *App) CreateRecord(table string, data map[string]interface{}) (map[string]interface{}, error) {
    // TODO: INSERT в БД
    return map[string]interface{}{
        "success": true,
        "message": "Record created successfully",
    }, nil
}

// UpdateRecord обновляет запись
func (a *App) UpdateRecord(table string, id int, data map[string]interface{}) (map[string]interface{}, error) {
    // TODO: UPDATE в БД
    return map[string]interface{}{
        "success": true,
        "message": "Record updated successfully",
    }, nil
}

// GetUser получает данные пользователя по ID
func (a *App) GetUser(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var user map[string]interface{}
    var idUser int
    var username, password_hash, email, phone, role, first_name, last_name, middle_name sql.NullString
    var reg_date sql.NullTime
    var is_active bool

    err := a.db.QueryRow(`
        SELECT idUser, username, password_hash, email, phone, reg_date, role,
               first_name, last_name, middle_name, is_active
        FROM User WHERE idUser = ?`, id).
        Scan(&idUser, &username, &password_hash, &email, &phone, &reg_date, &role,
            &first_name, &last_name, &middle_name, &is_active)

    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found")
        }
        return nil, err
    }

    user = map[string]interface{}{
        "idUser":       idUser,
        "username":     getString(username),
        "password_hash": getString(password_hash),
        "email":        getString(email),
        "phone":        getString(phone),
        "reg_date":     getTime(reg_date),
        "role":         getString(role),
        "first_name":   getString(first_name),
        "last_name":    getString(last_name),
        "middle_name":  getString(middle_name),
        "is_active":    is_active,
    }

    return user, nil
}

// Вспомогательные функции для обработки NULL
func getString(s sql.NullString) interface{} {
    if s.Valid {
        return s.String
    }
    return nil
}

func getTime(t sql.NullTime) interface{} {
    if t.Valid {
        return t.Time
    }
    return nil
}

// UpdateUser обновляет данные пользователя
func (a *App) UpdateUser(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE User SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["username"]; ok && val != "" {
        updates = append(updates, "username = ?")
        args = append(args, val)
    }
    if val, ok := data["email"]; ok && val != "" {
        updates = append(updates, "email = ?")
        args = append(args, val)
    }
    if val, ok := data["phone"]; ok {
        if val == "" {
            updates = append(updates, "phone = ?")
            args = append(args, nil)
        } else {
            updates = append(updates, "phone = ?")
            args = append(args, val)
        }
    }
    if val, ok := data["first_name"]; ok && val != "" {
        updates = append(updates, "first_name = ?")
        args = append(args, val)
    }
    if val, ok := data["last_name"]; ok && val != "" {
        updates = append(updates, "last_name = ?")
        args = append(args, val)
    }
    if val, ok := data["middle_name"]; ok {
        if val == "" {
            updates = append(updates, "middle_name = ?")
            args = append(args, nil)
        } else {
            updates = append(updates, "middle_name = ?")
            args = append(args, val)
        }
    }
    if val, ok := data["role"]; ok && val != "" {
        updates = append(updates, "role = ?")
        args = append(args, val)
    }
    if val, ok := data["is_active"]; ok {
        updates = append(updates, "is_active = ?")
        args = append(args, val)
    }
    if val, ok := data["password_hash"]; ok && val != "" {
        hashedPassword := fmt.Sprintf("%x", sha256.Sum256([]byte(val.(string))))
        updates = append(updates, "password_hash = ?")
        args = append(args, hashedPassword)
    }
    if val, ok := data["reg_date"]; ok {
         updates = append(updates, "reg_date = ?")
         args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE idUser = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "User updated successfully",
    }, nil
}

// GetProduct получает данные продукта по ID
func (a *App) GetProduct(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var product map[string]interface{}
    var productID int
    var name, description, mainImagePath sql.NullString
    var price, discountPrice sql.NullFloat64
    var discountStart, discountEnd, createdAt, updatedAt sql.NullTime
    var stock int
    var categoryID sql.NullInt64
    var isAvailable bool

    err := a.db.QueryRow(`
        SELECT product_id, name, description, price, discount_price,
               discount_start, discount_end, stock, category_id,
               main_image_path, is_available, created_at, updated_at
        FROM Product WHERE product_id = ?`, id).
        Scan(&productID, &name, &description, &price, &discountPrice,
            &discountStart, &discountEnd, &stock, &categoryID,
            &mainImagePath, &isAvailable, &createdAt, &updatedAt)

    if err != nil {
        return nil, err
    }

    product = map[string]interface{}{
        "product_id":      productID,
        "name":           getString(name),
        "description":    getString(description),
        "price":          getFloat64(price),
        "discount_price": getFloat64(discountPrice),
        "discount_start": getTime(discountStart),
        "discount_end":   getTime(discountEnd),
        "stock":          stock,
        "category_id":    getInt64(categoryID),
        "main_image_path": getString(mainImagePath),
        "is_available":   isAvailable,
        "created_at":     getTime(createdAt),
        "updated_at":     getTime(updatedAt),
    }

    return product, nil
}

// CreateProduct создаёт новый продукт
func (a *App) CreateProduct(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO Product (
        name, description, price, discount_price, discount_start, discount_end,
        stock, category_id, main_image_path, is_available, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    now := time.Now() // Объявляем now

    _, err := a.db.Exec(query,
        data["name"],
        data["description"],
        data["price"],
        data["discount_price"],
        data["discount_start"],
        data["discount_end"],
        data["stock"],
        data["category_id"],
        data["main_image_path"],
        data["is_available"],
        now, // created_at
        now, // updated_at
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product created successfully",
    }, nil
}

// UpdateProduct обновляет продукт
func (a *App) UpdateProduct(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Ставим текущее время без смещения
    data["updated_at"] = time.Now()

    query := "UPDATE Product SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["name"]; ok && val != "" {
        updates = append(updates, "name = ?")
        args = append(args, val)
    }
    if val, ok := data["description"]; ok {
        updates = append(updates, "description = ?")
        args = append(args, val)
    }
    if val, ok := data["price"]; ok && val != "" {
        updates = append(updates, "price = ?")
        args = append(args, val)
    }
    if val, ok := data["discount_price"]; ok {
        updates = append(updates, "discount_price = ?")
        args = append(args, val)
    }
    if val, ok := data["discount_start"]; ok {
        updates = append(updates, "discount_start = ?")
        args = append(args, val)
    }
    if val, ok := data["discount_end"]; ok {
        updates = append(updates, "discount_end = ?")
        args = append(args, val)
    }
    if val, ok := data["stock"]; ok {
        updates = append(updates, "stock = ?")
        args = append(args, val)
    }
    if val, ok := data["category_id"]; ok {
        updates = append(updates, "category_id = ?")
        args = append(args, val)
    }
    if val, ok := data["main_image_path"]; ok {
        updates = append(updates, "main_image_path = ?")
        args = append(args, val)
    }
    if val, ok := data["is_available"]; ok {
        updates = append(updates, "is_available = ?")
        args = append(args, val)
    }
    if val, ok := data["updated_at"]; ok {
        updates = append(updates, "updated_at = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE product_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product updated successfully",
    }, nil
}

// DeleteProduct удаляет продукт
func (a *App) DeleteProduct(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM Product WHERE product_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product deleted successfully",
    }, nil
}

// Вспомогательные функции (если ещё не добавлены)
func getFloat64(n sql.NullFloat64) interface{} {
    if n.Valid {
        return n.Float64
    }
    return nil
}

func getInt64(n sql.NullInt64) interface{} {
    if n.Valid {
        return n.Int64
    }
    return nil
}

// GetCategories получает список категорий
func (a *App) GetCategories() ([]map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    rows, err := a.db.Query("SELECT category_id, name FROM Category ORDER BY name")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var categories []map[string]interface{}
    for rows.Next() {
        var id int
        var name string
        err := rows.Scan(&id, &name)
        if err != nil {
            return nil, err
        }
        categories = append(categories, map[string]interface{}{
            "category_id": id,
            "name":        name,
        })
    }
    return categories, nil
}

// Login проверяет логин и пароль
func (a *App) Login(username, password string) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var id int
    var dbPassword string
    var role string
    var firstName, lastName, middleName sql.NullString
    var email string

    err := a.db.QueryRow(`
        SELECT idUser, password_hash, role, first_name, last_name, middle_name, email
        FROM User WHERE username = ?`,
        username,
    ).Scan(&id, &dbPassword, &role, &firstName, &lastName, &middleName, &email)

    if err != nil {
        if err == sql.ErrNoRows {
            return map[string]interface{}{
                "success": false,
                "message": "Invalid username or password",
            }, nil
        }
        return nil, err
    }

    hash := fmt.Sprintf("%x", sha256.Sum256([]byte(password)))

    if hash != dbPassword {
        return map[string]interface{}{
            "success": false,
            "message": "Invalid username or password",
        }, nil
    }

    if role != "Administrator" && role != "Employee" {
        return map[string]interface{}{
            "success": false,
            "message": "Insufficient permissions",
        }, nil
    }

    return map[string]interface{}{
        "success":    true,
        "userId":     id,
        "username":   username,
        "role":       role,
        "firstName":  getString(firstName),
        "lastName":   getString(lastName),
        "middleName": getString(middleName),
        "email":      email,
        "message":    "Login successful",
    }, nil
}

// GetCategory получает категорию по ID
func (a *App) GetCategory(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var categoryId int
    var name, description, mainImagePath sql.NullString
    var parentCategoryId sql.NullInt64

    err := a.db.QueryRow(`
        SELECT category_id, name, description, parent_category_id, main_image_path
        FROM Category WHERE category_id = ?`, id).
        Scan(&categoryId, &name, &description, &parentCategoryId, &mainImagePath)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "category_id":       categoryId,
        "name":             getString(name),
        "description":      getString(description),
        "parent_category_id": getInt64(parentCategoryId),
        "main_image_path":   getString(mainImagePath),
    }, nil
}

// CreateCategory создаёт новую категорию
func (a *App) CreateCategory(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO Category (name, description, parent_category_id, main_image_path)
              VALUES (?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["name"],
        data["description"],
        data["parent_category_id"],
        data["main_image_path"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Category created successfully",
    }, nil
}

// UpdateCategory обновляет категорию
func (a *App) UpdateCategory(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE Category SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["name"]; ok && val != "" {
        updates = append(updates, "name = ?")
        args = append(args, val)
    }
    if val, ok := data["description"]; ok {
        updates = append(updates, "description = ?")
        args = append(args, val)
    }
    if val, ok := data["parent_category_id"]; ok {
        updates = append(updates, "parent_category_id = ?")
        args = append(args, val)
    }
    if val, ok := data["main_image_path"]; ok {
        updates = append(updates, "main_image_path = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE category_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Category updated successfully",
    }, nil
}

// DeleteCategory удаляет категорию
func (a *App) DeleteCategory(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM Category WHERE category_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Category deleted successfully",
    }, nil
}

// GetOrder получает заказ по ID
func (a *App) GetOrder(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var orderId int
    var orderNumber, status, paymentMethod, paymentStatus, notes sql.NullString
    var userId sql.NullInt64
    var orderDate sql.NullTime

    err := a.db.QueryRow(`
        SELECT order_id, order_number, user_id, status, payment_method,
               payment_status, order_date, notes
        FROM ` + "`Order`" + ` WHERE order_id = ?`, id).
        Scan(&orderId, &orderNumber, &userId, &status, &paymentMethod,
             &paymentStatus, &orderDate, &notes)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "order_id":        orderId,
        "order_number":    getString(orderNumber),
        "user_id":         getInt64(userId),
        "status":          getString(status),
        "payment_method":  getString(paymentMethod),
        "payment_status":  getString(paymentStatus),
        "order_date":      getTime(orderDate),
        "notes":           getString(notes),
    }, nil
}

// CreateOrder создаёт новый заказ
func (a *App) CreateOrder(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Генерируем номер заказа если не указан
    orderNumber := data["order_number"]
    if orderNumber == nil || orderNumber == "" {
        generatedNumber, err := a.GenerateOrderNumber()
        if err != nil {
            return map[string]interface{}{
                "success": false,
                "message": "Failed to generate order number: " + err.Error(),
            }, nil
        }
        orderNumber = generatedNumber
    }

    query := `INSERT INTO ` + "`Order`" + ` (
        order_number, user_id, status, payment_method, payment_status, order_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        orderNumber,
        data["user_id"],
        data["status"],
        data["payment_method"],
        data["payment_status"],
        data["order_date"],
        data["notes"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order created successfully",
    }, nil
}

// UpdateOrder обновляет заказ
func (a *App) UpdateOrder(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE `Order` SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["order_number"]; ok && val != "" {
        updates = append(updates, "order_number = ?")
        args = append(args, val)
    }
    if val, ok := data["user_id"]; ok && val != "" {
        updates = append(updates, "user_id = ?")
        args = append(args, val)
    }
    if val, ok := data["status"]; ok {
        updates = append(updates, "status = ?")
        args = append(args, val)
    }
    if val, ok := data["payment_method"]; ok {
        updates = append(updates, "payment_method = ?")
        args = append(args, val)
    }
    if val, ok := data["payment_status"]; ok {
        updates = append(updates, "payment_status = ?")
        args = append(args, val)
    }
    if val, ok := data["order_date"]; ok {
        updates = append(updates, "order_date = ?")
        args = append(args, val)
    }
    if val, ok := data["notes"]; ok {
        updates = append(updates, "notes = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE order_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order updated successfully",
    }, nil
}

// DeleteOrder удаляет заказ
func (a *App) DeleteOrder(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM `Order` WHERE order_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order deleted successfully",
    }, nil
}

// GetOrderItem получает позицию заказа по ID
func (a *App) GetOrderItem(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var itemId int
    var orderId, productId int
    var quantity int
    var price float64

    err := a.db.QueryRow(`
        SELECT order_item_id, order_id, product_id, quantity, price
        FROM order_item WHERE order_item_id = ?`, id).
        Scan(&itemId, &orderId, &productId, &quantity, &price)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "order_item_id": itemId,
        "order_id":      orderId,
        "product_id":    productId,
        "quantity":      quantity,
        "price":         price,
    }, nil
}

// CreateOrderItem создаёт новую позицию заказа
func (a *App) CreateOrderItem(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO order_item (order_id, product_id, quantity, price)
              VALUES (?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["order_id"],
        data["product_id"],
        data["quantity"],
        data["price"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order item created successfully",
    }, nil
}

// UpdateOrderItem обновляет позицию заказа
func (a *App) UpdateOrderItem(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE order_item SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["order_id"]; ok && val != "" {
        updates = append(updates, "order_id = ?")
        args = append(args, val)
    }
    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["quantity"]; ok && val != "" {
        updates = append(updates, "quantity = ?")
        args = append(args, val)
    }
    if val, ok := data["price"]; ok && val != "" {
        updates = append(updates, "price = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE order_item_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order item updated successfully",
    }, nil
}

// DeleteOrderItem удаляет позицию заказа
func (a *App) DeleteOrderItem(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM order_item WHERE order_item_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Order item deleted successfully",
    }, nil
}

// GetCartItem получает элемент корзины по ID
func (a *App) GetCartItem(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var itemId int
    var userId, productId int
    var quantity int
    var addedAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT cart_item_id, user_id, product_id, quantity, added_at
        FROM cart_item WHERE cart_item_id = ?`, id).
        Scan(&itemId, &userId, &productId, &quantity, &addedAt)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "cart_item_id": itemId,
        "user_id":      userId,
        "product_id":   productId,
        "quantity":     quantity,
        "added_at":     getTime(addedAt),
    }, nil
}

// CreateCartItem создаёт новый элемент корзины
func (a *App) CreateCartItem(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO cart_item (user_id, product_id, quantity, added_at)
              VALUES (?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["user_id"],
        data["product_id"],
        data["quantity"],
        data["added_at"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Cart item created successfully",
    }, nil
}

// UpdateCartItem обновляет элемент корзины
func (a *App) UpdateCartItem(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE cart_item SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["user_id"]; ok && val != "" {
        updates = append(updates, "user_id = ?")
        args = append(args, val)
    }
    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["quantity"]; ok && val != "" {
        updates = append(updates, "quantity = ?")
        args = append(args, val)
    }
    if val, ok := data["added_at"]; ok {
        updates = append(updates, "added_at = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE cart_item_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Cart item updated successfully",
    }, nil
}

// DeleteCartItem удаляет элемент корзины
func (a *App) DeleteCartItem(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM cart_item WHERE cart_item_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Cart item deleted successfully",
    }, nil
}

// GetDelivery получает доставку по ID
func (a *App) GetDelivery(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var deliveryId int
    var orderId int
    var address, status, recipientName, trackingNumber sql.NullString
    var deliveryDate, deliveredAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT delivery_id, order_id, address, delivery_date, status,
               recipient_name, tracking_number, delivered_at
        FROM delivery WHERE delivery_id = ?`, id).
        Scan(&deliveryId, &orderId, &address, &deliveryDate, &status,
             &recipientName, &trackingNumber, &deliveredAt)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "delivery_id":     deliveryId,
        "order_id":        orderId,
        "address":         getString(address),
        "delivery_date":   getTime(deliveryDate),
        "status":          getString(status),
        "recipient_name":  getString(recipientName),
        "tracking_number": getString(trackingNumber),
        "delivered_at":    getTime(deliveredAt),
    }, nil
}

// CreateDelivery создаёт новую доставку
func (a *App) CreateDelivery(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO delivery (
        order_id, address, delivery_date, status, recipient_name, tracking_number, delivered_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["order_id"],
        data["address"],
        data["delivery_date"],
        data["status"],
        data["recipient_name"],
        data["tracking_number"],
        data["delivered_at"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Delivery created successfully",
    }, nil
}

// UpdateDelivery обновляет доставку
func (a *App) UpdateDelivery(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE delivery SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["order_id"]; ok && val != "" {
        updates = append(updates, "order_id = ?")
        args = append(args, val)
    }
    if val, ok := data["address"]; ok && val != "" {
        updates = append(updates, "address = ?")
        args = append(args, val)
    }
    if val, ok := data["delivery_date"]; ok {
        updates = append(updates, "delivery_date = ?")
        args = append(args, val)
    }
    if val, ok := data["status"]; ok {
        updates = append(updates, "status = ?")
        args = append(args, val)
    }
    if val, ok := data["recipient_name"]; ok {
        updates = append(updates, "recipient_name = ?")
        args = append(args, val)
    }
    if val, ok := data["tracking_number"]; ok {
        updates = append(updates, "tracking_number = ?")
        args = append(args, val)
    }
    if val, ok := data["delivered_at"]; ok {
        updates = append(updates, "delivered_at = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE delivery_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Delivery updated successfully",
    }, nil
}

// DeleteDelivery удаляет доставку
func (a *App) DeleteDelivery(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM delivery WHERE delivery_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Delivery deleted successfully",
    }, nil
}

// GetReview получает отзыв по ID
func (a *App) GetReview(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var reviewId int
    var productId, userId int
    var rating int
    var comment, advantages, disadvantages sql.NullString
    var createdAt sql.NullTime
    var isApproved bool

    err := a.db.QueryRow(`
        SELECT review_id, product_id, user_id, rating, comment,
               advantages, disadvantages, created_at, is_approved
        FROM review WHERE review_id = ?`, id).
        Scan(&reviewId, &productId, &userId, &rating, &comment,
             &advantages, &disadvantages, &createdAt, &isApproved)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "review_id":     reviewId,
        "product_id":    productId,
        "user_id":       userId,
        "rating":        rating,
        "comment":       getString(comment),
        "advantages":    getString(advantages),
        "disadvantages": getString(disadvantages),
        "created_at":    getTime(createdAt),
        "is_approved":   isApproved,
    }, nil
}

// CreateReview создаёт новый отзыв
func (a *App) CreateReview(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // НЕ ПРЕОБРАЗУЕМ ВРЕМЯ
    createdAt := data["created_at"]
    if createdAt == nil || createdAt == "" {
        createdAt = time.Now().Format("2006-01-02 15:04:05")
    }

    query := `INSERT INTO review (
        product_id, user_id, rating, comment, advantages, disadvantages, is_approved, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["product_id"],
        data["user_id"],
        data["rating"],
        data["comment"],
        data["advantages"],
        data["disadvantages"],
        data["is_approved"],
        createdAt,
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Review created successfully",
    }, nil
}

// UpdateReview обновляет отзыв
func (a *App) UpdateReview(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE review SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["user_id"]; ok && val != "" {
        updates = append(updates, "user_id = ?")
        args = append(args, val)
    }
    if val, ok := data["rating"]; ok && val != "" {
        updates = append(updates, "rating = ?")
        args = append(args, val)
    }
    if val, ok := data["comment"]; ok {
        updates = append(updates, "comment = ?")
        args = append(args, val)
    }
    if val, ok := data["advantages"]; ok {
        updates = append(updates, "advantages = ?")
        args = append(args, val)
    }
    if val, ok := data["disadvantages"]; ok {
        updates = append(updates, "disadvantages = ?")
        args = append(args, val)
    }
    if val, ok := data["is_approved"]; ok {
        updates = append(updates, "is_approved = ?")
        args = append(args, val)
    }
    if val, ok := data["created_at"]; ok {
        // НЕ ПРЕОБРАЗУЕМ - используем как есть
        updates = append(updates, "created_at = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE review_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Review updated successfully",
    }, nil
}

// DeleteReview удаляет отзыв
func (a *App) DeleteReview(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM review WHERE review_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Review deleted successfully",
    }, nil
}

// GetWishlist получает элемент вишлиста по ID
func (a *App) GetWishlist(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var wishlistId int
    var userId, productId int
    var addedAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT wishlist_id, user_id, product_id, added_at
        FROM wishlist WHERE wishlist_id = ?`, id).
        Scan(&wishlistId, &userId, &productId, &addedAt)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "wishlist_id": wishlistId,
        "user_id":     userId,
        "product_id":  productId,
        "added_at":    getTime(addedAt),
    }, nil
}

// CreateWishlist создаёт новый элемент вишлиста
func (a *App) CreateWishlist(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Проверяем уникальность
    var exists bool
    err := a.db.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM wishlist
            WHERE user_id = ? AND product_id = ?
        )`, data["user_id"], data["product_id"]).Scan(&exists)

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": "Error checking duplicate: " + err.Error(),
        }, nil
    }

    if exists {
        return map[string]interface{}{
            "success": false,
            "message": "This item is already in user's wishlist",
        }, nil
    }

    // НЕ ПРЕОБРАЗУЕМ ВРЕМЯ - используем как есть из data
    addedAt := data["added_at"]
    if addedAt == nil || addedAt == "" {
        addedAt = time.Now().Format("2006-01-02 15:04:05")
    }

    query := `INSERT INTO wishlist (user_id, product_id, added_at)
              VALUES (?, ?, ?)`

    _, err = a.db.Exec(query,
        data["user_id"],
        data["product_id"],
        addedAt,
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Item added to wishlist successfully",
    }, nil
}

// UpdateWishlist обновляет элемент вишлиста
func (a *App) UpdateWishlist(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE wishlist SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["user_id"]; ok && val != "" {
        updates = append(updates, "user_id = ?")
        args = append(args, val)
    }
    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["added_at"]; ok {
        // НЕ ПРЕОБРАЗУЕМ - используем как есть
        updates = append(updates, "added_at = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE wishlist_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Wishlist item updated successfully",
    }, nil
}

// DeleteWishlist удаляет элемент вишлиста
func (a *App) DeleteWishlist(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM wishlist WHERE wishlist_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Wishlist item deleted successfully",
    }, nil
}

// ========== INVOICE_IN METHODS ==========

// GetInvoiceIn получает входящую накладную по ID
func (a *App) GetInvoiceIn(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var invoiceId int
    var invoiceNumber, supplier sql.NullString
    var productId int
    var quantity int
    var purchasePrice float64
    var invoiceDate, createdAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT invoice_in_id, invoice_number, invoice_date, product_id,
               quantity, purchase_price, supplier, created_at
        FROM invoice_in WHERE invoice_in_id = ?`, id).
        Scan(&invoiceId, &invoiceNumber, &invoiceDate, &productId,
             &quantity, &purchasePrice, &supplier, &createdAt)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "invoice_in_id":  invoiceId,
        "invoice_number": getString(invoiceNumber),
        "invoice_date":   getTime(invoiceDate),
        "product_id":     productId,
        "quantity":       quantity,
        "purchase_price": purchasePrice,
        "supplier":       getString(supplier),
        "created_at":     getTime(createdAt),
    }, nil
}

// CreateInvoiceIn создаёт входящую накладную
func (a *App) CreateInvoiceIn(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO invoice_in (
        invoice_number, invoice_date, product_id, quantity, purchase_price, supplier
    ) VALUES (?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["invoice_number"],
        data["invoice_date"],
        data["product_id"],
        data["quantity"],
        data["purchase_price"],
        data["supplier"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Incoming invoice created successfully",
    }, nil
}

// UpdateInvoiceIn обновляет входящую накладную
func (a *App) UpdateInvoiceIn(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE invoice_in SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["invoice_number"]; ok {
        updates = append(updates, "invoice_number = ?")
        args = append(args, val)
    }
    if val, ok := data["invoice_date"]; ok {
        updates = append(updates, "invoice_date = ?")
        args = append(args, val)
    }
    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["quantity"]; ok && val != "" {
        updates = append(updates, "quantity = ?")
        args = append(args, val)
    }
    if val, ok := data["purchase_price"]; ok && val != "" {
        updates = append(updates, "purchase_price = ?")
        args = append(args, val)
    }
    if val, ok := data["supplier"]; ok {
        updates = append(updates, "supplier = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE invoice_in_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Incoming invoice updated successfully",
    }, nil
}

// DeleteInvoiceIn удаляет входящую накладную
func (a *App) DeleteInvoiceIn(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM invoice_in WHERE invoice_in_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Incoming invoice deleted successfully",
    }, nil
}

// ========== INVOICE_OUT METHODS ==========

// GetInvoiceOut получает исходящую накладную по ID
func (a *App) GetInvoiceOut(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var invoiceId int
    var invoiceNumber, orderNumber sql.NullString
    var orderId, productId int
    var quantity int
    var price float64
    var invoiceDate, createdAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT io.invoice_out_id, io.invoice_number, io.invoice_date,
               io.order_id, io.product_id, io.quantity, io.price, io.created_at,
               o.order_number
        FROM invoice_out io
        LEFT JOIN ` + "`Order`" + ` o ON o.order_id = io.order_id
        WHERE io.invoice_out_id = ?`, id).
        Scan(&invoiceId, &invoiceNumber, &invoiceDate, &orderId,
             &productId, &quantity, &price, &createdAt, &orderNumber)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "invoice_out_id": invoiceId,
        "invoice_number": getString(invoiceNumber),
        "invoice_date":   getTime(invoiceDate),
        "order_id":       orderId,
        "order_number":   getString(orderNumber),
        "product_id":     productId,
        "quantity":       quantity,
        "price":          price,
        "created_at":     getTime(createdAt),
    }, nil
}

// CreateInvoiceOut создаёт исходящую накладную
func (a *App) CreateInvoiceOut(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO invoice_out (
        invoice_number, invoice_date, order_id, product_id, quantity, price
    ) VALUES (?, ?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        data["invoice_number"],
        data["invoice_date"],
        data["order_id"],
        data["product_id"],
        data["quantity"],
        data["price"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Outgoing invoice created successfully",
    }, nil
}

// UpdateInvoiceOut обновляет исходящую накладную
func (a *App) UpdateInvoiceOut(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE invoice_out SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["invoice_number"]; ok {
        updates = append(updates, "invoice_number = ?")
        args = append(args, val)
    }
    if val, ok := data["invoice_date"]; ok {
        updates = append(updates, "invoice_date = ?")
        args = append(args, val)
    }
    if val, ok := data["order_id"]; ok && val != "" {
        updates = append(updates, "order_id = ?")
        args = append(args, val)
    }
    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["quantity"]; ok && val != "" {
        updates = append(updates, "quantity = ?")
        args = append(args, val)
    }
    if val, ok := data["price"]; ok && val != "" {
        updates = append(updates, "price = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE invoice_out_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Outgoing invoice updated successfully",
    }, nil
}

// DeleteInvoiceOut удаляет исходящую накладную
func (a *App) DeleteInvoiceOut(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM invoice_out WHERE invoice_out_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Outgoing invoice deleted successfully",
    }, nil
}

// ========== RECEIPT METHODS ==========

// GetReceipt получает чек по ID
func (a *App) GetReceipt(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var receiptId int
    var receiptNumber, paymentMethod sql.NullString
    var orderId int
    var totalAmount float64
    var receiptDate, createdAt sql.NullTime

    err := a.db.QueryRow(`
        SELECT receipt_id, receipt_number, receipt_date, order_id,
               total_amount, payment_method, created_at
        FROM receipt WHERE receipt_id = ?`, id).
        Scan(&receiptId, &receiptNumber, &receiptDate, &orderId,
             &totalAmount, &paymentMethod, &createdAt)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "receipt_id":     receiptId,
        "receipt_number": getString(receiptNumber),
        "receipt_date":   getTime(receiptDate),
        "order_id":       orderId,
        "total_amount":   totalAmount,
        "payment_method": getString(paymentMethod),
        "created_at":     getTime(createdAt),
    }, nil
}

// CreateReceipt создаёт новый чек
func (a *App) CreateReceipt(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    // Генерируем номер чека если не указан
    receiptNumber := data["receipt_number"]
    if receiptNumber == nil || receiptNumber == "" {
        receiptNumber = fmt.Sprintf("RCP-%d", time.Now().Unix())
    }

    query := `INSERT INTO receipt (
        receipt_number, receipt_date, order_id, total_amount, payment_method
    ) VALUES (?, ?, ?, ?, ?)`

    _, err := a.db.Exec(query,
        receiptNumber,
        data["receipt_date"],
        data["order_id"],
        data["total_amount"],
        data["payment_method"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Receipt created successfully",
    }, nil
}

// UpdateReceipt обновляет чек
func (a *App) UpdateReceipt(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE receipt SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["receipt_number"]; ok && val != "" {
        updates = append(updates, "receipt_number = ?")
        args = append(args, val)
    }
    if val, ok := data["receipt_date"]; ok {
        updates = append(updates, "receipt_date = ?")
        args = append(args, val)
    }
    if val, ok := data["order_id"]; ok && val != "" {
        updates = append(updates, "order_id = ?")
        args = append(args, val)
    }
    if val, ok := data["total_amount"]; ok && val != "" {
        updates = append(updates, "total_amount = ?")
        args = append(args, val)
    }
    if val, ok := data["payment_method"]; ok {
        updates = append(updates, "payment_method = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE receipt_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Receipt updated successfully",
    }, nil
}

// DeleteReceipt удаляет чек
func (a *App) DeleteReceipt(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM receipt WHERE receipt_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Receipt deleted successfully",
    }, nil
}

// ========== PRODUCT IMAGE METHODS ==========

// GetProductImage получает изображение товара по ID
func (a *App) GetProductImage(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    var imageId int
    var productId int
    var imagePath string
    var sortOrder int

    err := a.db.QueryRow(`
        SELECT image_id, product_id, image_path, sort_order
        FROM product_image WHERE image_id = ?`, id).
        Scan(&imageId, &productId, &imagePath, &sortOrder)

    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "image_id":   imageId,
        "product_id": productId,
        "image_path": imagePath,
        "sort_order": sortOrder,
    }, nil
}

// CreateProductImage создаёт новое изображение товара
func (a *App) CreateProductImage(data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := `INSERT INTO product_image (product_id, image_path, sort_order)
              VALUES (?, ?, ?)`

    _, err := a.db.Exec(query,
        data["product_id"],
        data["image_path"],
        data["sort_order"],
    )

    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product image created successfully",
    }, nil
}

// UpdateProductImage обновляет изображение товара
func (a *App) UpdateProductImage(id int, data map[string]interface{}) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    query := "UPDATE product_image SET "
    args := []interface{}{}
    updates := []string{}

    if val, ok := data["product_id"]; ok && val != "" {
        updates = append(updates, "product_id = ?")
        args = append(args, val)
    }
    if val, ok := data["image_path"]; ok && val != "" {
        updates = append(updates, "image_path = ?")
        args = append(args, val)
    }
    if val, ok := data["sort_order"]; ok {
        updates = append(updates, "sort_order = ?")
        args = append(args, val)
    }

    if len(updates) == 0 {
        return map[string]interface{}{
            "success": true,
            "message": "No changes to update",
        }, nil
    }

    query += strings.Join(updates, ", ") + " WHERE image_id = ?"
    args = append(args, id)

    _, err := a.db.Exec(query, args...)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product image updated successfully",
    }, nil
}

// DeleteProductImage удаляет изображение товара
func (a *App) DeleteProductImage(id int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    _, err := a.db.Exec("DELETE FROM product_image WHERE image_id = ?", id)
    if err != nil {
        return map[string]interface{}{
            "success": false,
            "message": err.Error(),
        }, nil
    }

    return map[string]interface{}{
        "success": true,
        "message": "Product image deleted successfully",
    }, nil
}

// GenerateOrderNumber генерирует номер заказа в формате ORD-2025-001
func (a *App) GenerateOrderNumber() (string, error) {
    if a.db == nil {
        return "", fmt.Errorf("database not connected")
    }

    currentYear := time.Now().Year()
    yearStr := fmt.Sprintf("%d", currentYear)

    // Находим максимальный номер заказа за текущий год
    query := `SELECT order_number FROM ` + "`Order`" + `
              WHERE order_number LIKE ?
              ORDER BY order_number DESC LIMIT 1`

    pattern := "ORD-" + yearStr + "-%"
    var lastOrderNumber sql.NullString
    err := a.db.QueryRow(query, pattern).Scan(&lastOrderNumber)

    var sequence int = 1
    var suffix string = ""

    if err == nil && lastOrderNumber.Valid {
        // Парсим существующий номер
        parts := strings.Split(lastOrderNumber.String, "-")
        if len(parts) >= 3 {
            numPart := parts[2]
            // Извлекаем число и суффикс (если есть)
            var num int
            var suf string
            for i, ch := range numPart {
                if ch < '0' || ch > '9' {
                    num, _ = strconv.Atoi(numPart[:i])
                    suf = numPart[i:]
                    break
                }
            }
            if num == 0 {
                num, _ = strconv.Atoi(numPart)
            }

            if num >= 999 {
                // Если достигли 999, увеличиваем суффикс
                if suf == "" {
                    sequence = 1
                    suffix = "2"
                } else {
                    suffixNum, _ := strconv.Atoi(suf)
                    suffix = strconv.Itoa(suffixNum + 1)
                    sequence = 1
                }
            } else {
                sequence = num + 1
                suffix = suf
            }
        }
    }

    // Форматируем номер с ведущими нулями (3 цифры)
    sequenceStr := fmt.Sprintf("%03d", sequence)
    orderNumber := fmt.Sprintf("ORD-%s-%s%s", yearStr, sequenceStr, suffix)

    return orderNumber, nil
}

// SearchOrders выполняет поиск по заказам с поддержкой поиска по пользователю
func (a *App) SearchOrders(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    // Поиск по номеру заказа или по имени/фамилии пользователя
    searchPattern := "%" + search + "%"

    countQuery := `
        SELECT COUNT(*) FROM ` + "`Order`" + ` o
        LEFT JOIN User u ON o.user_id = u.idUser
        WHERE o.order_number LIKE ?
           OR u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT o.order_id, o.order_number, o.user_id, o.status, o.payment_method,
               o.payment_status, o.order_date, o.notes
        FROM ` + "`Order`" + ` o
        LEFT JOIN User u ON o.user_id = u.idUser
        WHERE o.order_number LIKE ?
           OR u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    // Получаем колонки
    colRows, err := a.db.Query("SHOW COLUMNS FROM `Order`")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchOrderItems выполняет поиск по позициям заказов
func (a *App) SearchOrderItems(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    // Поиск по номеру заказа или названию товара
    countQuery := `
        SELECT COUNT(*) FROM order_item oi
        LEFT JOIN ` + "`Order`" + ` o ON oi.order_id = o.order_id
        LEFT JOIN Product p ON oi.product_id = p.product_id
        WHERE o.order_number LIKE ?
           OR p.name LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.price
        FROM order_item oi
        LEFT JOIN ` + "`Order`" + ` o ON oi.order_id = o.order_id
        LEFT JOIN Product p ON oi.product_id = p.product_id
        WHERE o.order_number LIKE ?
           OR p.name LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    // Получаем колонки
    colRows, err := a.db.Query("SHOW COLUMNS FROM order_item")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchCartItems выполняет поиск по корзине
func (a *App) SearchCartItems(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    // Поиск по имени пользователя или названию товара
    countQuery := `
        SELECT COUNT(*) FROM cart_item ci
        LEFT JOIN User u ON ci.user_id = u.idUser
        LEFT JOIN Product p ON ci.product_id = p.product_id
        WHERE u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR p.name LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT ci.cart_item_id, ci.user_id, ci.product_id, ci.quantity, ci.added_at
        FROM cart_item ci
        LEFT JOIN User u ON ci.user_id = u.idUser
        LEFT JOIN Product p ON ci.product_id = p.product_id
        WHERE u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR p.name LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    // Получаем колонки
    colRows, err := a.db.Query("SHOW COLUMNS FROM cart_item")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchReviews выполняет поиск по отзывам
func (a *App) SearchReviews(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    // Поиск по названию товара, имени пользователя или комментарию
    countQuery := `
        SELECT COUNT(*) FROM review r
        LEFT JOIN Product p ON r.product_id = p.product_id
        LEFT JOIN User u ON r.user_id = u.idUser
        WHERE p.name LIKE ?
           OR u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR r.comment LIKE ?
    `

    err := a.db.QueryRow(countQuery,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT r.review_id, r.product_id, r.user_id, r.rating, r.comment,
               r.advantages, r.disadvantages, r.created_at, r.is_approved
        FROM review r
        LEFT JOIN Product p ON r.product_id = p.product_id
        LEFT JOIN User u ON r.user_id = u.idUser
        WHERE p.name LIKE ?
           OR u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR r.comment LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    // Получаем колонки
    colRows, err := a.db.Query("SHOW COLUMNS FROM review")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchWishlist выполняет поиск по избранному
func (a *App) SearchWishlist(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    // Поиск по имени пользователя или названию товара
    countQuery := `
        SELECT COUNT(*) FROM wishlist w
        LEFT JOIN User u ON w.user_id = u.idUser
        LEFT JOIN Product p ON w.product_id = p.product_id
        WHERE u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR p.name LIKE ?
    `

    err := a.db.QueryRow(countQuery,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT w.wishlist_id, w.user_id, w.product_id, w.added_at
        FROM wishlist w
        LEFT JOIN User u ON w.user_id = u.idUser
        LEFT JOIN Product p ON w.product_id = p.product_id
        WHERE u.username LIKE ?
           OR u.first_name LIKE ?
           OR u.last_name LIKE ?
           OR u.email LIKE ?
           OR p.name LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    // Получаем колонки
    colRows, err := a.db.Query("SHOW COLUMNS FROM wishlist")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchInvoiceIn выполняет поиск по приходным накладным
func (a *App) SearchInvoiceIn(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    countQuery := `
        SELECT COUNT(*) FROM invoice_in ii
        LEFT JOIN Product p ON ii.product_id = p.product_id
        WHERE ii.invoice_number LIKE ?
           OR p.name LIKE ?
           OR ii.supplier LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT ii.invoice_in_id, ii.invoice_number, ii.invoice_date,
               ii.product_id, ii.quantity, ii.purchase_price, ii.supplier, ii.created_at
        FROM invoice_in ii
        LEFT JOIN Product p ON ii.product_id = p.product_id
        WHERE ii.invoice_number LIKE ?
           OR p.name LIKE ?
           OR ii.supplier LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    colRows, err := a.db.Query("SHOW COLUMNS FROM invoice_in")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchInvoiceOut выполняет поиск по расходным накладным
func (a *App) SearchInvoiceOut(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    countQuery := `
        SELECT COUNT(*) FROM invoice_out io
        LEFT JOIN ` + "`Order`" + ` o ON io.order_id = o.order_id
        LEFT JOIN Product p ON io.product_id = p.product_id
        WHERE io.invoice_number LIKE ?
           OR o.order_number LIKE ?
           OR p.name LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT io.invoice_out_id, io.invoice_number, io.invoice_date,
               io.order_id, io.product_id, io.quantity, io.price, io.created_at
        FROM invoice_out io
        LEFT JOIN ` + "`Order`" + ` o ON io.order_id = o.order_id
        LEFT JOIN Product p ON io.product_id = p.product_id
        WHERE io.invoice_number LIKE ?
           OR o.order_number LIKE ?
           OR p.name LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    colRows, err := a.db.Query("SHOW COLUMNS FROM invoice_out")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

// SearchReceipt выполняет поиск по чекам
func (a *App) SearchReceipt(page int, search string, perPage int) (map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }

    offset := (page - 1) * perPage
    var rows []map[string]interface{}
    var total int

    searchPattern := "%" + search + "%"

    countQuery := `
        SELECT COUNT(*) FROM receipt r
        LEFT JOIN ` + "`Order`" + ` o ON r.order_id = o.order_id
        WHERE r.receipt_number LIKE ?
           OR o.order_number LIKE ?
    `

    err := a.db.QueryRow(countQuery, searchPattern, searchPattern).Scan(&total)
    if err != nil {
        return nil, err
    }

    dataQuery := `
        SELECT r.receipt_id, r.receipt_number, r.receipt_date,
               r.order_id, r.total_amount, r.payment_method, r.created_at
        FROM receipt r
        LEFT JOIN ` + "`Order`" + ` o ON r.order_id = o.order_id
        WHERE r.receipt_number LIKE ?
           OR o.order_number LIKE ?
        LIMIT ? OFFSET ?
    `

    rowsResult, err := a.db.Query(dataQuery, searchPattern, searchPattern, perPage, offset)
    if err != nil {
        return nil, err
    }
    defer rowsResult.Close()

    rows = a.scanRows(rowsResult)

    colRows, err := a.db.Query("SHOW COLUMNS FROM receipt")
    if err != nil {
        return nil, err
    }
    defer colRows.Close()

    var columns []string
    for colRows.Next() {
        var field, typ, null, key, extra string
        var defaultValue sql.NullString
        colRows.Scan(&field, &typ, &null, &key, &defaultValue, &extra)
        columns = append(columns, field)
    }

    return map[string]interface{}{
        "columns": columns,
        "rows":    rows,
        "total":   total,
    }, nil
}

func (a *App) ReadFileBase64(filePath string) (string, error) {
    data, err := os.ReadFile(filePath)
    if err != nil {
        return "", err
    }
    return base64.StdEncoding.EncodeToString(data), nil
}

func (a *App) ExportInvoiceWithTemplate(reportType string, startDate, endDate string) (string, error) {
    if a.db == nil {
        return "", fmt.Errorf("database not connected")
    }

    var templatePath string
    switch reportType {
    case "in":
        templatePath = "templates/invoice_in.xlsx"
    case "out":
        templatePath = "templates/invoice_out.xlsx"
    default:
        return "", fmt.Errorf("unknown report type")
    }

    // Копируем шаблон
    data, err := os.ReadFile(templatePath)
    if err != nil {
        return "", fmt.Errorf("не удалось прочитать шаблон: %v", err)
    }
    tmp, err := os.CreateTemp("", "report_*.xlsx")
    if err != nil {
        return "", err
    }
    tmpPath := tmp.Name()
    tmp.Close()
    if err := os.WriteFile(tmpPath, data, 0644); err != nil {
        return "", err
    }

    f, err := excelize.OpenFile(tmpPath)
    if err != nil {
        return "", fmt.Errorf("ошибка открытия файла: %v", err)
    }
    defer f.Close()

    sheetName := "Лист2"
    startRow := 31
    currentRow := startRow

    var rows *sql.Rows
    switch reportType {
    case "in":
        rows, err = a.db.Query(`
            SELECT p.product_id, p.name, ii.quantity, ii.purchase_price
            FROM invoice_in ii
            LEFT JOIN product p ON p.product_id = ii.product_id
            WHERE DATE(ii.invoice_date) BETWEEN ? AND ?
            ORDER BY ii.invoice_date ASC
        `, startDate, endDate)
    case "out":
        rows, err = a.db.Query(`
            SELECT p.product_id, p.name, io.quantity, io.price
            FROM invoice_out io
            LEFT JOIN product p ON p.product_id = io.product_id
            WHERE DATE(io.invoice_date) BETWEEN ? AND ?
            ORDER BY io.invoice_date ASC
        `, startDate, endDate)
    }
    if err != nil {
        return "", err
    }
    defer rows.Close()

    styleID := copyRowStyle(f, sheetName, startRow)
    if styleID == 0 {
        styleID, _ = f.NewStyle(&excelize.Style{
            Border: []excelize.Border{
                {Type: "left", Color: "000000", Style: 1},
                {Type: "top", Color: "000000", Style: 1},
                {Type: "bottom", Color: "000000", Style: 1},
                {Type: "right", Color: "000000", Style: 1},
            },
            Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
        })
    }

    idx := 1
    totalQty := 0
    totalGross := 0.0
    totalNet := 0
    totalAmount := 0.0
    totalVAT := 0.0
    totalWithVAT := 0.0

    for rows.Next() {
        var productId int
        var product string
        var qty int
        var price float64
        if err := rows.Scan(&productId, &product, &qty, &price); err != nil {
            return "", err
        }

        sum := float64(qty) * price
        vat := sum * 0.2
        gross := float64(qty) * 0.5
        net := qty

        totalQty += qty
        totalGross += gross
        totalNet += net
        totalAmount += sum
        totalVAT += vat
        totalWithVAT += sum + vat

        now := time.Now()
        dateStr := now.Format("20060102")
        randomNum := rand.Intn(999) + 1
        docNumber := fmt.Sprintf("INV-%s-%03d", dateStr, randomNum)
        f.SetCellValue(sheetName, "I26", docNumber)
        f.SetCellValue(sheetName, "K26", now.Format("02.01.2006"))

        setCellWithStyle(f, sheetName, fmt.Sprintf("A%d", currentRow), idx, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("B%d", currentRow), product, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("C%d", currentRow), productId, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("D%d", currentRow), "шт", styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("E%d", currentRow), "796", styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("F%d", currentRow), "Коробка", styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("G%d", currentRow), 1, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("H%d", currentRow), qty, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("I%d", currentRow), gross, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("J%d", currentRow), net, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("K%d", currentRow), price, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("L%d", currentRow), sum, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("M%d", currentRow), "20%", styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("N%d", currentRow), vat, styleID)
        setCellWithStyle(f, sheetName, fmt.Sprintf("O%d", currentRow), sum+vat, styleID)

        idx++
        currentRow++
    }

    if idx == 1 {
        return "", fmt.Errorf("нет данных за выбранный период")
    }

    totalRow := currentRow
    setCellWithStyle(f, sheetName, fmt.Sprintf("G%d", totalRow), "Итого", styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("H%d", totalRow), totalQty, styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("I%d", totalRow), totalGross, styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("J%d", totalRow), totalNet, styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("K%d", totalRow), "X", styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("L%d", totalRow), totalAmount, styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("M%d", totalRow), "X", styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("N%d", totalRow), totalVAT, styleID)
    setCellWithStyle(f, sheetName, fmt.Sprintf("O%d", totalRow), totalWithVAT, styleID)

    // ===== НОВЫЙ БЛОК: убираем лишние границы и задаём шрифт для G =====
    // Стиль только с верхней границей (для A-F)
    styleTopOnly, _ := f.NewStyle(&excelize.Style{
        Border: []excelize.Border{
            {Type: "top", Color: "000000", Style: 1},
        },
        Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
    })
    // Стиль с верхней и правой границей + шрифт Times New Roman 9pt (для G)
    styleTopRight, _ := f.NewStyle(&excelize.Style{
        Border: []excelize.Border{
            {Type: "top", Color: "000000", Style: 1},
            {Type: "right", Color: "000000", Style: 1},
        },
        Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
        Font: &excelize.Font{
            Family: "Times New Roman",
            Size:   9,
        },
    })

    // Применяем стили
    for col := 'A'; col <= 'F'; col++ {
        cell := fmt.Sprintf("%c%d", col, totalRow)
        f.SetCellValue(sheetName, cell, "")          // очищаем значение
        f.SetCellStyle(sheetName, cell, cell, styleTopOnly)
    }
    // Применяем к G: стиль с верхней+правой + шрифт
    f.SetCellStyle(sheetName, fmt.Sprintf("G%d", totalRow), fmt.Sprintf("G%d", totalRow), styleTopRight)

    // Сохраняем
    if err := f.Save(); err != nil {
        return "", err
    }

    return tmpPath, nil
}

// helpers (те же, что и ранее)
func findTotalRow(f *excelize.File, sheet string) int {
    rows, err := f.Rows(sheet)
    if err != nil {
        return -1
    }
    defer rows.Close()
    rowIdx := 1
    for rows.Next() {
        cols, err := rows.Columns()
        if err == nil && len(cols) > 1 {
            if strings.Contains(cols[0], "Итого") || strings.Contains(cols[1], "Итого") {
                return rowIdx
            }
        }
        rowIdx++
    }
    return -1
}

func copyRowStyle(f *excelize.File, sheet string, row int) int {
    cell := fmt.Sprintf("A%d", row)
    styleID, err := f.GetCellStyle(sheet, cell)
    if err != nil {
        return 0
    }
    return styleID
}

func setCellWithStyle(f *excelize.File, sheet, cell string, value interface{}, styleID int) {
    f.SetCellValue(sheet, cell, value)
    if styleID != 0 {
        f.SetCellStyle(sheet, cell, cell, styleID)
    }
}

func clearRow(f *excelize.File, sheet string, row int) {
    for col := 'A'; col <= 'O'; col++ {
        f.SetCellValue(sheet, fmt.Sprintf("%c%d", col, row), "")
    }
}

func (a *App) GetReportData(reportType string, startDate, endDate string) ([]map[string]interface{}, error) {
    if a.db == nil {
        return nil, fmt.Errorf("database not connected")
    }
    var rows *sql.Rows
    var err error

    switch reportType {
    case "in":
        rows, err = a.db.Query(`
            SELECT DATE(ii.invoice_date) as invoice_date,
                   ii.invoice_number,
                   COALESCE(p.name, '') as product_name,
                   ii.quantity,
                   ii.purchase_price,
                   COALESCE(ii.supplier, '') as supplier
            FROM invoice_in ii
            LEFT JOIN product p ON p.product_id = ii.product_id
            WHERE DATE(ii.invoice_date) BETWEEN ? AND ?
            ORDER BY ii.invoice_date ASC
        `, startDate, endDate)
    case "out":
        rows, err = a.db.Query(`
            SELECT DATE(io.invoice_date) as invoice_date,
                   io.invoice_number,
                   COALESCE(o.order_number, '') as order_number,
                   COALESCE(p.name, '') as product_name,
                   io.quantity,
                   io.price
            FROM invoice_out io
            LEFT JOIN product p ON p.product_id = io.product_id
            LEFT JOIN ` + "`Order`" + ` o ON o.order_id = io.order_id
            WHERE DATE(io.invoice_date) BETWEEN ? AND ?
            ORDER BY io.invoice_date ASC
        `, startDate, endDate)
    case "receipts":
        rows, err = a.db.Query(`
            SELECT DATE(r.receipt_date) as receipt_date,
                   r.receipt_number,
                   COALESCE(o.order_number, '') as order_number,
                   CONCAT(COALESCE(u.last_name, ''), ' ', COALESCE(u.first_name, '')) as customer_name,
                   r.total_amount
            FROM receipt r
            LEFT JOIN ` + "`Order`" + ` o ON o.order_id = r.order_id
            LEFT JOIN user u ON u.idUser = o.user_id
            WHERE DATE(r.receipt_date) BETWEEN ? AND ?
            ORDER BY r.receipt_date ASC
        `, startDate, endDate)
    default:
        return nil, fmt.Errorf("unknown report type")
    }
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    // Получаем имена колонок
    columns, err := rows.Columns()
    if err != nil {
        return nil, err
    }

    var result []map[string]interface{}
    for rows.Next() {
        // Создаём срез для хранения значений
        values := make([]interface{}, len(columns))
        valuePtrs := make([]interface{}, len(columns))
        for i := range values {
            valuePtrs[i] = &values[i]
        }
        if err := rows.Scan(valuePtrs...); err != nil {
            return nil, err
        }
        row := make(map[string]interface{})
        for i, col := range columns {
            val := values[i]
            // Преобразуем []byte в строку
            if b, ok := val.([]byte); ok {
                row[col] = string(b)
            } else {
                row[col] = val
            }
        }
        result = append(result, row)
    }
    return result, nil
}