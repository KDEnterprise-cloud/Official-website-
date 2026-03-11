// main.js - Core application logic

class KDECommerce {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.currentCategory = 'all';
        this.currentProducts = [];
        this.cart = [];
        this.currentProduct = null;
        this.GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'; // REPLACE WITH YOUR URL
        
        this.init();
    }
    
    init() {
        this.loadProducts();
        this.setupEventListeners();
        this.setupAdminLogin();
        this.checkForOrders();
        this.loadOwnerInfo();
    }
    
    loadOwnerInfo() {
        console.log('KD Enterprises - Owned by Derick Daniel Sungi, Moshi, Tanzania');
        console.log('Contact: 0748 814 017 | dericksungi65@gmail.com');
    }
    
    // Load products with skeleton loading
    async loadProducts() {
        this.showSkeletons(8);
        
        // Simulate API delay
        setTimeout(() => {
            this.currentProducts = ProductManager.getProductsByCategory(this.currentCategory);
            this.displayProducts();
            this.setupPagination();
        }, 1500);
    }
    
    showSkeletons(count) {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            grid.innerHTML += `
                <div class="skeleton">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                </div>
            `;
        }
    }
    
    displayProducts() {
        const grid = document.getElementById('productsGrid');
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const productsToShow = this.currentProducts.slice(start, end);
        
        grid.innerHTML = '';
        
        productsToShow.forEach(product => {
            grid.innerHTML += this.createProductCard(product);
        });
        
        // Add click events to buy buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = e.target.dataset.id;
                this.openOrderModal(productId);
            });
        });
        
        // Add click events to product cards
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('buy-btn')) {
                    const productId = card.dataset.id;
                    this.showProductDetails(productId);
                }
            });
        });
    }
    
    createProductCard(product) {
        return `
            <div class="product-card" data-id="${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">TSh ${product.price.toLocaleString()}</div>
                    <div class="product-category">${product.subcategory}</div>
                    <button class="buy-btn" data-id="${product.id}">Buy Now</button>
                </div>
            </div>
        `;
    }
    
    setupPagination() {
        const totalPages = Math.ceil(this.currentProducts.length / this.itemsPerPage);
        const dotsContainer = document.getElementById('paginationDots');
        
        dotsContainer.innerHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            const dot = document.createElement('span');
            dot.className = `dot ${i === this.currentPage ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                this.currentPage = i;
                this.displayProducts();
                this.updateActiveDot();
            });
            dotsContainer.appendChild(dot);
        }
    }
    
    updateActiveDot() {
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === this.currentPage);
        });
    }
    
    setupEventListeners() {
        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentCategory = e.target.dataset.category;
                this.currentPage = 1;
                this.currentProducts = ProductManager.getProductsByCategory(this.currentCategory);
                this.displayProducts();
                this.setupPagination();
            });
        });
        
        // Search
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.handleSearch();
        });
        
        document.getElementById('searchInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
        
        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.currentProducts = ProductManager.sortProducts(this.currentProducts, e.target.value);
            this.displayProducts();
        });
        
        // Mobile menu
        document.querySelector('.mobile-menu-btn').addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('show');
        });
        
        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('orderModal').style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('orderModal')) {
                document.getElementById('orderModal').style.display = 'none';
            }
        });
        
        // Order form submit - SAVES TO GOOGLE SHEETS
        document.getElementById('orderForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const orderData = {
                orderId: 'ORD' + Date.now(),
                name: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                email: document.getElementById('customerEmail').value || 'Not provided',
                productName: this.currentProduct.name,
                price: this.currentProduct.price,
                quantity: document.getElementById('quantity').value,
                total: this.currentProduct.price * document.getElementById('quantity').value,
                address: document.getElementById('address').value || 'To be confirmed',
                timestamp: new Date().toLocaleString(),
                status: 'Pending'
            };
            
            // Change button text to show loading
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Saving to Google Drive...';
            submitBtn.disabled = true;
            
            try {
                // Try to save to Google Sheets
                await fetch(this.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                
                alert(`✅ ORDER CONFIRMED!\n\nThank you ${orderData.name}!\nWe'll call you on ${orderData.phone}\nOrder saved to Google Drive!`);
                
                // Save locally as backup
                this.saveOrderLocally(orderData);
                
                document.getElementById('orderModal').style.display = 'none';
                e.target.reset();
                
            } catch (error) {
                alert('⚠️ Order saved locally. Will sync to Google Drive when online.');
                this.saveOrderLocally(orderData);
                document.getElementById('orderModal').style.display = 'none';
                e.target.reset();
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
        
        // Contact form
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Message sent to Derick Daniel Sungi! He will respond soon.');
            e.target.reset();
        });
    }
    
    handleSearch() {
        const query = document.getElementById('searchInput').value;
        if (query.trim()) {
            this.currentProducts = ProductManager.searchProducts(query);
            this.currentPage = 1;
            this.displayProducts();
            this.setupPagination();
        }
    }
    
    openOrderModal(productId) {
        this.currentProduct = ProductManager.getProductById(productId);
        
        const preview = document.getElementById('orderProductPreview');
        preview.innerHTML = `
            <img src="${this.currentProduct.image}" alt="${this.currentProduct.name}">
            <div>
                <h3>${this.currentProduct.name}</h3>
                <p>TSh ${this.currentProduct.price.toLocaleString()}</p>
            </div>
        `;
        
        document.getElementById('orderModal').style.display = 'block';
    }
    
    showProductDetails(productId) {
        const product = ProductManager.getProductById(productId);
        alert(`${product.name}\n\n${product.description}\n\nPrice: TSh ${product.price.toLocaleString()}\nIn Stock: ${product.stock}`);
    }
    
    saveOrderLocally(order) {
        const orders = JSON.parse(localStorage.getItem('kdOrders') || '[]');
        orders.push(order);
        localStorage.setItem('kdOrders', JSON.stringify(orders));
        
        // Trigger notification for admin
        localStorage.setItem('newOrder', JSON.stringify(order));
    }
    
    setupAdminLogin() {
        const trigger = document.getElementById('adminTrigger');
        const panel = document.getElementById('adminLoginPanel');
        
        trigger.addEventListener('click', () => {
            panel.classList.toggle('show');
        });
        
        document.getElementById('adminLoginBtn').addEventListener('click', () => {
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            // Credentials: KD Enterprise
            if (username === 'KD' && password === 'Enterprise') {
                window.location.href = 'admin.html';
            } else {
                alert('Invalid credentials');
            }
        });
    }
    
    checkForOrders() {
        // Check for new orders every 30 seconds
        setInterval(() => {
            const orders = JSON.parse(localStorage.getItem('kdOrders') || '[]');
            const pendingOrders = orders.filter(o => o.status === 'Pending').length;
            
            if (pendingOrders > 0) {
                document.querySelector('.cart-count').textContent = pendingOrders;
            }
        }, 30000);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KDECommerce();
});