const mockProducts = [
  { id: 1, name: "Industrial Steel Bolts - M12", sku: "SKU-STL-001", category: "Hardware", price: 450, stock: 500, description: "High-grade stainless steel bolts.", image: "🔩" },
  { id: 2, name: "Copper Wiring - 100m Roll", sku: "SKU-ELE-042", category: "Electrical", price: 12500, stock: 85, description: "Premium copper wiring.", image: "🔌" },
  { id: 3, name: "Hydraulic Jack - 5 Ton", sku: "SKU-MCH-112", category: "Machinery", price: 3200, stock: 120, description: "Heavy-duty hydraulic jack.", image: "🏗️" },
  { id: 4, name: "LED Office Panel - 2x2ft", sku: "SKU-LGT-089", category: "Lighting", price: 1850, stock: 250, description: "Energy-efficient LED panels.", image: "💡" },
];

const mockApprovals = [
  { id: 1, type: "VENDOR", title: "Apex Industrial Supplies", status: "pending", createdAt: new Date().toISOString() },
  { id: 2, type: "CREDIT", title: "Global Tech Solutions", status: "pending", createdAt: new Date().toISOString() },
];

const mockStats = { totalUsers: 1240, totalOrders: 856, pendingApprovals: 12, revenue: 4580000 };

const mockOrders = [
  { id: "ORD-001", items: [{ name: "Steel Bolts", quantity: 10, price: 450 }], total: 4500, status: "DELIVERED", date: "2026-04-10" },
  { id: "ORD-002", items: [{ name: "LED Panel", quantity: 5, price: 1850 }], total: 9250, status: "SHIPPED", date: "2026-04-15" },
];

const mockNotifications = [
  { id: 1, title: "New Order Received", message: "Order #ORD-123 has been placed.", type: "INFO", createdAt: new Date().toISOString() },
  { id: 2, title: "Payment Successful", message: "Payment for order #ORD-122 received.", type: "SUCCESS", createdAt: new Date().toISOString() },
];

const mockCredit = { limit: 1000000, used: 250000, available: 750000, dueAmount: 50000, dueDate: "2026-05-01" };

const mockAuditLogs = [
  { id: 1, user: "admin@mokshith.com", action: "UPDATE_PRODUCT", target: "Steel Bolts", timestamp: new Date().toISOString() },
  { id: 2, user: "superadmin@mokshith.com", action: "CREATE_ADMIN", target: "admin2@mokshith.com", timestamp: new Date().toISOString() },
];

const mockCategories = [
  { id: 1, name: "Hardware", subcategories: ["Bolts", "Tools"], status: "ACTIVE" },
  { id: 2, name: "Electrical", subcategories: ["Wiring", "Lighting"], status: "ACTIVE" },
  { id: 3, name: "Machinery", subcategories: ["Hydraulics", "Engines"], status: "ACTIVE" },
];

const mockMetrics = {
  totalUsers: 1540,
  activeVendors: 42,
  ordersToday: 28,
  revenueToday: 185000,
  pendingApprovals: 8
};

// Global config stored in memory for mock persistence
let globalConfig = {
  siteName: "Mokshith Enterprises",
  supportEmail: "support@mokshith.com",
  maintenanceMode: false,
  allowRegistration: true,
  defaultCurrency: "INR",
  orderCutoffTime: "18:00",
  maxCreditLimit: 1000000,
  enableCOD: true,
  commissionRate: 5,
  featureFlags: {
    creditSystem: true,
    cod: true,
    notifications: true,
    reviews: true,
    recommendations: true,
    dynamicPricing: false,
  }
};

const apiClient = {
  get: async (url) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check maintenance mode for all GET except superadmin
    if (globalConfig.maintenanceMode && !url.includes("superadmin")) {
       throw new Error("System is under maintenance. Please try again later.");
    }

    if (url === "/products") return mockProducts;
    if (url === "/admin/approvals") return mockApprovals;
    if (url === "/admin/stats") return mockStats;
    if (url === "/orders") return mockOrders;
    if (url === "/notifications") return mockNotifications;
    if (url === "/credit") return mockCredit;
    if (url === "/credit/ledger") return [
      { id: 1, type: "DEBIT", amount: 50000, description: "Bulk Order #ORD-11", date: "2026-04-01" },
      { id: 2, type: "CREDIT", amount: 20000, description: "Payment Received", date: "2026-04-10" }
    ];
    if (url === "/superadmin/audit-logs") return mockAuditLogs;
    if (url === "/superadmin/admins") return [{ id: 1, name: "Admin One", email: "admin@mokshith.com", status: "ACTIVE" }];
    if (url === "/superadmin/config") return globalConfig;
    if (url === "/superadmin/metrics") return mockMetrics;
    if (url === "/superadmin/categories") return mockCategories;
    
    if (url === "/admin/logs") return [
      { id: 1, user: "admin@mokshith.com", action: "APPROVE_VENDOR", target: "Apex Industrial", timestamp: new Date().toISOString() },
      { id: 2, user: "admin@mokshith.com", action: "UPDATE_STOCK", target: "Steel Bolts", timestamp: new Date().toISOString() }
    ];
    if (url === "/deliveries") return [
      { id: 1, orderId: "ORD-001", customerName: "John B2C", address: "123 Street, Bangalore", status: "PENDING", items: 2 },
      { id: 2, orderId: "ORD-002", customerName: "Global Tech", address: "IT Park, Hyderabad", status: "PICKED_UP", items: 5 }
    ];

    // Database Shell Mock Collections
    if (url.includes("/superadmin/db/")) {
      const collection = url.split("/").pop();
      if (collection === "users") return [{ id: 1, name: "Admin", email: "admin@mokshith.com", role: "ADMIN" }, { id: 2, name: "Vendor", email: "b2b@vendor.com", role: "VENDOR" }];
      if (collection === "products") return mockProducts;
      if (collection === "orders") return mockOrders;
      if (collection === "payments") return [{ id: 1, orderId: "ORD-001", amount: 4500, status: "SUCCESS" }];
      if (collection === "credit") return [mockCredit];
    }

    throw new Error('Not found: ' + url);
  },
  
  post: async (url, data) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check maintenance mode for all POST except superadmin login/config
    const isSuperAdminAction = url.includes("superadmin") || (url === "/auth/login" && data.email.includes("super"));
    if (globalConfig.maintenanceMode && !isSuperAdminAction) {
       throw new Error("System is under maintenance. Please try again later.");
    }

    if (url === "/auth/login") {
      let role = "USER";
      if (data.email.includes('super')) role = "SUPER_ADMIN";
      else if (data.email.includes('admin')) role = "ADMIN";
      else if (data.email.includes('delivery')) role = "DELIVERY";
      else if (data.email.includes('b2b')) role = "VENDOR";
      
      return {
        success: true,
        data: {
          user: { id: 1, name: "Mokshith User", email: data.email, role },
          token: "mock-jwt-token-" + Math.random().toString(36).substr(2),
          config: globalConfig
        },
        message: "Login successful"
      };
    }

    if (url === "/superadmin/config") {
      globalConfig = { ...globalConfig, ...data };
      return { success: true, data: globalConfig, message: "Configuration updated" };
    }

    if (url === "/auth/register" || url === "/auth/logout" || url === "/orders" || url.startsWith("/admin/approve/") || url.startsWith("/admin/reject/") || url.includes("/status")) {
      return { success: true, message: "Action completed", data: null };
    }
    throw new Error('Endpoint not found: ' + url);
  }
};

export default apiClient;
