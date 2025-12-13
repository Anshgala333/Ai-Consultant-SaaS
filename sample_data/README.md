# Sample Data Files for AI Consultant SaaS

This folder contains sample CSV data files that can be uploaded through the **Data Upload** section to test the AI Consultant dashboard functionality.

## Available Files

### 1. `sales_data.csv` (130+ records)
Daily sales transactions with:
- **date**: Transaction date
- **sku**: Product SKU code
- **product_name**: Name of the item sold
- **quantity**: Quantity sold
- **unit_price**: Price per unit (₹)
- **amount**: Total sale amount (₹)
- **category**: Product category (Main Course, Starters, Breads, etc.)
- **outlet**: Outlet name

**Data Type in Upload:** `sales`

### 2. `wastage_data.csv` (68 records)
Daily wastage logs with:
- **date**: Date of wastage
- **item**: Name of wasted item
- **sku**: SKU code
- **quantity**: Quantity wasted (kg/pieces)
- **unit_cost**: Cost per unit (₹)
- **value**: Total wastage value (₹)
- **reason**: Reason for wastage (Expired, Spoiled, Unsold, etc.)
- **category**: Item category (Meat, Dairy, Vegetables, etc.)
- **outlet**: Outlet name

**Data Type in Upload:** `wastage`

### 3. `inventory_data.csv` (65 records)
Periodic inventory snapshots with:
- **date**: Inventory date
- **sku**: Item SKU
- **product_name**: Item name
- **quantity**: Stock quantity
- **cost_price**: Purchase cost (₹)
- **selling_price**: Selling price (₹) - 0 for raw materials
- **category**: Item category

**Data Type in Upload:** `inventory`

### 4. `customer_feedback.csv` (40 records)
Customer reviews with:
- **date**: Feedback date
- **name**: Customer name
- **contact**: Phone number
- **email**: Email address
- **rating**: Rating (1-5)
- **comment**: Detailed feedback
- **sentiment**: Sentiment analysis (positive, neutral, negative)
- **category**: Feedback category
- **outlet**: Outlet name

**Data Type in Upload:** `feedback` (or use the Feedback Collection module)

### 5. `staff_logs.csv` (40 records)
Staff observation logs with:
- **date**: Log date
- **staff_name**: Staff member name
- **staff_id**: Staff ID
- **log_type**: Type of log (wastage, stock_out, quality_issue, equipment, observation)
- **description**: Detailed description
- **severity**: Issue severity (low, medium, high, critical)
- **status**: Log status (pending_review, acknowledged, reviewed, resolved)
- **outlet**: Outlet name

**Data Type in Upload:** `staff_logs` (or use the Staff Log module)

---

## How to Use

1. **Login** to the AI Consultant dashboard
2. Navigate to **"Data Upload"** from the sidebar
3. Click **"Upload Data"** or drag-and-drop a CSV file
4. Select the appropriate **Data Type** for the file
5. Map columns if needed, or accept auto-detected mappings
6. Click **"Complete Upload"**

After uploading:
- Go to **Dashboard** to see updated KPIs
- Visit **KPI History** to view trends over time
- Check **Issues** for any auto-detected problems
- Generate **AI Recommendations** based on your data

---

## Data Overview

| File | Records | Date Range | Total Value |
|------|---------|------------|-------------|
| sales_data.csv | 130 | Dec 1-13, 2024 | ₹10+ Lakhs |
| wastage_data.csv | 68 | Dec 1-13, 2024 | ₹15,000+ |
| inventory_data.csv | 65 | Dec 1, 5, 10 | Stock worth ₹50,000+ |
| customer_feedback.csv | 40 | Dec 1-13, 2024 | Avg Rating: 4.0/5 |
| staff_logs.csv | 40 | Dec 1-13, 2024 | Various issues |

---

## Notes

- All data is for a **restaurant/food business** demo scenario
- Currency values are in **Indian Rupees (₹)**
- The data covers a **2-week period** (December 1-13, 2024)
- Multiple **outlets** are represented
- Data is designed to show **realistic trends and issues**
