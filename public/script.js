// Global variable to store menu items
let menuItems = [];
let addons = [];
let addonsObj = [];


async function fetchMenu() {
    try {
        const response = await fetch('https://epsteincoffee.onrender.com/api/menu');
        if (!response.ok) throw new Error('Failed to fetch menu');
        const data = await response.json();
        menuItems = Array.isArray(data) ? data : []; // Ensure menuItems is always an array
        return menuItems;
    } catch (error) {
        console.error('Error fetching menu:', error);
        menuItems = [];
        return [];
    }
}

async function fetchAddons(){
    try {
        const responce = await fetch('https://epsteincoffee.onrender.com/api/addons');
        if (!responce.ok) throw new Error('Failed to fetch menu');
        const data = await responce.json();
        addons = Array.isArray(data) ? data : []
        addonsObj = Object.fromEntries(
        addons.map(a => [a.id, { name: a.name, price: a.price }])
        );
        return addons
    } catch (error) {
        console.error('Error fetching addons: ', error);
        addons = [];
        return []
    }
}


let cart = {};
let lastOrder = null;

const menuList = document.getElementById('menu-list');
const cartList = document.getElementById('cart-list');
const snackList = document.getElementById('snack-list');
const cartEmpty = document.getElementById('cart-empty');
const cartOrderBtn = document.getElementById('cart-order-btn');
const cartCount = document.getElementById('cart-count');
const cartIcon = document.querySelector('.cart-icon');
const sections = document.querySelectorAll('.page-section');
const navLinks = document.querySelectorAll('.nav__link');
const btnLookMenu = document.getElementById('btn-look-menu');
const homeSection = document.getElementById('home');
const paymentText = document.getElementById('payment-text');
const paymentSequence = document.getElementById('payment-sequence');
const paymentTotal = document.getElementById('payment-total');
const paymentItems = document.getElementById('payment-items');

function generateVariationId(itemId, addons) {
    const addonKeys = Object.keys(addons).filter(k => addons[k]).sort().join(',');
    return `${itemId}_${addonKeys || 'no-addons'}`;
}

function renderMenu() {
    if (!Array.isArray(menuItems)) menuItems = [];
    const menuItemsCut = menuItems.slice(0, 9);
    menuList.innerHTML = '';
    snackList.innerHTML = '';
    const itemAddonStates = {};
    menuItemsCut.forEach(item => {
        if (!itemAddonStates[item.id]) {
            itemAddonStates[item.id] = addons.reduce((acc, addon) => {
              acc[addon.id] = false;
              return acc;
            }, {});;
        }
    });

    menuItemsCut.forEach(item => {
    const article = document.createElement('article');
    article.className = 'menu__item';

    const addonselection = addons.map(addon => {
        return `
            <button class="menu__btn-addon" 
                data-id="${item.id}" 
                data-addon="${addon.id}" 
                aria-label="Добавить ${addon.name} к ${item.name}">
                + ${addon.name}
            </button>
        `;
    }).join(''); // turn array into a single string

    article.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="menu__img" />
        <h3 class="menu__item-title">${item.name}</h3>
        <p class="menu__item-description">${item.description}</p>
        <div class="menu__item-price">${item.price} ₽</div>
        <div class="menu__item-buttons">
            <button class="menu__btn-order" data-id="${item.id}" aria-label="Заказать ${item.name}">Заказать</button>
            <button class="menu__btn-cart" data-id="${item.id}" aria-label="Добавить ${item.name} в корзину">В корзину</button>
            ${addonselection}
        </div>
    `;

    // Append article to container (make sure you have a container like menuContainer)
    menuList.appendChild(article);
});


    menuItems.filter(item => !menuItemsCut.includes(item)).forEach(item => {
        const article = document.createElement('article');
        article.className = 'menu__item';
        article.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="menu__img" />
            <h3 class="menu__item-title">${item.name}</h3>
            <p class="menu__item-description">${item.description}</p>
            <div class="menu__item-price">${item.price} ₽</div>
            <div class="menu__item-buttons">
                <button class="menu__btn-order" data-id="${item.id}" aria-label="Заказать ${item.name}">Заказать</button>
                <button class="menu__btn-cart" data-id="${item.id}" aria-label="Добавить ${item.name} в корзину">В корзину</button>
            </div>
        `;
        snackList.appendChild(article);
    });

    menuItemsCut.forEach(item => {
        const addonButtons = document.querySelectorAll(`.menu__btn-addon[data-id="${item.id}"]`);
        addonButtons.forEach(btn => {
            btn.classList.toggle('menu__btn-addon--active', itemAddonStates[item.id][btn.dataset.addon]);
            btn.addEventListener('click', () => {
                const addon = btn.dataset.addon;
                console.log(addon)
                itemAddonStates[item.id][addon] = !itemAddonStates[item.id][addon];
                btn.classList.toggle('menu__btn-addon--active', itemAddonStates[item.id][addon]);
            });
        });
    });
    window.getItemAddonStates = () => itemAddonStates;
}

function generateRandomSequence() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function saveCart() {
    localStorage.setItem('coffeelike_cart', JSON.stringify(cart));
}

function loadCart() {
    try {
        const saved = localStorage.getItem('coffeelike_cart');
        if (saved) {
            cart = JSON.parse(saved);
            if (typeof cart !== 'object' || cart === null) {
                cart = {};
            }
        } else {
            cart = {};
        }
    } catch (e) {
        console.error('Failed to load cart from localStorage:', e);
        cart = {};
    }
}

function updateCartBadge() {
    const totalCount = Object.values(cart).reduce((acc, item) => acc + item.qty, 0);
    cartCount.style.display = totalCount > 0 ? 'inline-block' : 'none';
    cartCount.textContent = totalCount;
}

function renderCart() {
    cartList.innerHTML = '';
    const variationIds = Object.keys(cart);
    if (variationIds.length === 0) {
        cartEmpty.style.display = 'block';
        cartOrderBtn.innerHTML = `Просмотреть меню`;
        return;
    }

    cartEmpty.style.display = 'none';
    let totalCartPrice = 0;

    variationIds.forEach(variationId => {
        const { itemId, qty, addons: itemAddons } = cart[variationId];
        const item = menuItems.find(i => i.id === itemId);
        if (!item) {
            console.warn(`Item with ID ${itemId} not found in menuItems, skipping`);
            delete cart[variationId]; // Clean up invalid items
            saveCart();
            return;
        }

        const addonNames = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .map(addon => addonsObj[addon]?.name || addon);
        const addonText = addonNames.length > 0 ? `Добавки: ${addonNames.join(', ')}` : '';
        const addonPrice = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .reduce((sum, addon) => sum + (addonsObj[addon]?.price || 0), 0);
        const totalPrice = (item.price + addonPrice) * qty;
        totalCartPrice += totalPrice;

        const li = document.createElement('li');
        li.className = 'cart__item';
        li.setAttribute('data-variation-id', variationId);
        li.innerHTML = `
            <div class="cart__item-info">
                <div class="cart__item-name">${item.name}</div>
                ${addonText ? `<div class="cart__item-addons">${addonText}</div>` : ''}
                <div class="cart__item-qty">
                    Количество: 
                    <button class="qty-btn decrement" aria-label="Уменьшить количество ${item.name} на 1">-</button>
                    <span class="qty-number">${qty}</span>
                    <button class="qty-btn increment" aria-label="Увеличить количество ${item.name} на 1">+</button>
                </div>
            </div>
            <div>${totalPrice} ₽</div>
        `;

        li.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('keypress', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });

        cartList.appendChild(li);
    });

    cartOrderBtn.innerHTML = `Оформить заказ (${totalCartPrice} ₽)`;
}

function clearCart() {
    cart = {};
    saveCart();
    updateCartBadge();
    renderMenu();
}

function setActiveSection(targetId) {
    sections.forEach(section => {
        section.classList.toggle('page-section--active', section.id === targetId);
    });
    navLinks.forEach(link => {
        link.classList.toggle('nav__link--active', link.dataset.target === targetId);
    });
    btnLookMenu.classList.toggle('button--hidden', targetId !== 'home');
    homeSection.classList.toggle('home--reduced', targetId !== 'home');
    if (targetId === 'cart') {
        renderCart();
    } else if (targetId === 'menu') {
        renderMenu();
    }
}

function showPayment(totalQuantity, totalPrice, orderedItems) {
    setActiveSection('payment');
    const randomSequence = generateRandomSequence();
    paymentSequence.textContent = `Ваш код: ${randomSequence}`;
    paymentText.textContent = `Вы заказали ${totalQuantity} позицию(й). Спасибо за покупку!`;
    paymentTotal.textContent = `Итого: ${totalPrice} ₽`;
    paymentItems.innerHTML = '';
    orderedItems.forEach(({ item, qty, addons: itemAddons }) => {
        if (!item) {
            console.warn('Invalid item in orderedItems, skipping');
            return;
        }
        const div = document.createElement('div');
        div.className = 'payment__item';
        const addonNames = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .map(addon => addonsObj[addon]?.name || addon);
        const addonText = addonNames.length > 0 ? `<div class="payment__item-addons">Добавки: ${addonNames.join(', ')}</div>` : '';
        const addonPrice = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .reduce((acc, addon) => acc + (addonsObj[addon]?.price || 0), 0);
        const itemTotalPrice = (item.price + addonPrice) * qty;
        div.innerHTML = `
            ${item.name} x${qty} ${addonText}
            <div class="payment__item-price">Цена: ${itemTotalPrice} ₽</div>
        `;
        paymentItems.appendChild(div);
    });
    // Save order to localStorage
    const orderHistory = JSON.parse(localStorage.getItem('coffeelike_orderHistory') || '[]');
    orderHistory.push({ sequence: randomSequence, quantity: totalQuantity, totalPrice, items: orderedItems, date: new Date().toISOString() });
    localStorage.setItem('coffeelike_orderHistory', JSON.stringify(orderHistory));
}

function handleMenuButtonClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (!id) return;

    const itemAddonStates = window.getItemAddonStates();
    const selectedAddons = document.querySelector(`.menu__item-selected-addons[data-id="${id}"]`);
    const addonButtons = document.querySelectorAll(`.menu__btn-addon[data-id="${id}"]`);
    let currentAddons = {};
    addonButtons.forEach(btn => {
        if (itemAddonStates[id][btn.dataset.addon]) {
            currentAddons[btn.dataset.addon] = true;
        }
    });

    const variationId = generateVariationId(id, currentAddons);

    if (target.classList.contains('menu__btn-cart')) {
        if (!cart[variationId]) {
            cart[variationId] = { itemId: id, qty: 0, addons: { ...currentAddons } };
        }
        cart[variationId].qty += 1;
        saveCart();
        updateCartBadge();
        itemAddonStates[id] = addons.reduce((acc, addon) => {
              acc[addon.id] = false;
              return acc;
            }, {});;
        addonButtons.forEach(btn => btn.classList.remove('menu__btn-addon--active'));
        renderMenu();
    } else if (target.classList.contains('menu__btn-order')) {
        cart = {};
        cart[variationId] = { itemId: id, qty: 1, addons: { ...currentAddons } };
        saveCart();
        updateCartBadge();
        const item = menuItems.find(i => i.id === id);
        if (!item) {
            console.error(`Item with ID ${id} not found`);
            return;
        }
        const addonPrice = Object.keys(currentAddons)
            .filter(addon => currentAddons[addon])
            .reduce((sum, addon) => sum + (addonsObj[addon]?.price || 0), 0);
        console.log(addonPrice)
        lastOrder = [{ item, qty: 1, addons: { ...currentAddons } }];
        showPayment(1, item.price + addonPrice, lastOrder);
        cart = {};
        saveCart();
        updateCartBadge();
        itemAddonStates[id] = { chocolateSyrup: false, pistachioMilk: false, nonLactoseCream: false };
        addonButtons.forEach(btn => btn.classList.remove('menu__btn-addon--active'));
        selectedAddons.textContent = '';
        renderMenu();
    }
}

function handleCartIconClick() {
    setActiveSection('cart');
}

function handleCartOrderClick() {
    const totalQuantity = Object.values(cart).reduce((acc, item) => acc + Number(item.qty || 0), 0);
    if (Object.keys(cart).length === 0) {
        setActiveSection('menu');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        cartOrderBtn.innerHTML = `Просмотреть меню`;
        return;
    }

    const totalPrice = Object.keys(cart).reduce((acc, variationId) => {
        const { itemId, qty, addons: itemAddons } = cart[variationId];
        const item = menuItems.find(i => i.id === itemId);
        if (!item) {
            console.warn(`Item with ID ${itemId} not found in menuItems, skipping`);
            return acc;
        }
        const addonPrice = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .reduce((sum, addon) => sum + (addonsObj[addon]?.price || 0), 0);
        return acc + (item.price + addonPrice) * qty;
    }, 0);

    lastOrder = Object.keys(cart).map(variationId => {
        const { itemId, qty, addons: itemAddons } = cart[variationId];
        const item = menuItems.find(i => i.id === itemId);
        if (!item) {
            console.warn(`Item with ID ${itemId} not found in menuItems, skipping`);
            return null;
        }
        return { item, qty, addons: { ...itemAddons } };
    }).filter(order => order !== null);

    clearCart();
    showPayment(totalQuantity, totalPrice, lastOrder);
}

function handlePaymentBackClick() {
    setActiveSection('menu');
    lastOrder = null;
}

function handleCartListClick(e) {
    const target = e.target;
    const li = target.closest('.cart__item');
    if (!li) return;
    const variationId = li.getAttribute('data-variation-id');
    if (!cart[variationId]) return;
    if (target.classList.contains('increment')) {
        cart[variationId].qty += 1;
    } else if (target.classList.contains('decrement')) {
        if (cart[variationId].qty > 1) {
            cart[variationId].qty -= 1;
        } else {
            delete cart[variationId];
        }
    }
    saveCart();
    updateCartBadge();
    renderCart();
}

async function submitOrder() {
    const userId = localStorage.getItem('userId') || 'guest';
    const items = Object.keys(cart).map(variationId => ({
        variationId,
        ...cart[variationId],
    }));
    // Save order to localStorage instead of API call
    const orderHistory = JSON.parse(localStorage.getItem('coffeelike_orderHistory') || '[]');
    const totalPrice = Object.keys(cart).reduce((acc, variationId) => {
        const { itemId, qty, addons: itemAddons } = cart[variationId];
        const item = menuItems.find(i => i.id === itemId);
        if (!item) return acc;
        const addonPrice = Object.keys(itemAddons)
            .filter(addon => itemAddons[addon])
            .reduce((sum, addon) => sum + (addonsObj[addon]?.price || 0), 0);
        return acc + (item.price + addonPrice) * qty;
    }, 0);
    const randomSequence = generateRandomSequence();
    orderHistory.push({ userId, items, totalPrice, sequence: randomSequence, date: new Date().toISOString() });
    localStorage.setItem('coffeelike_orderHistory', JSON.stringify(orderHistory));

    cart = {};
    saveCart();
    updateCartBadge();
    renderCart();
}

async function init() {
    cartIcon.style.display = 'none'
    navLinks.forEach(item => {
        item.style.display = 'none'
    });
    await fetchMenu(); // Fetch and update menuItems globally
    await fetchAddons()
    document.getElementById('home__title').textContent=`CoffeeLike`
    btnLookMenu.style.display = ''
    cartIcon.style.display = ''
    cartIcon.classList.add('fade-in-top')
    btnLookMenu.classList.add('fade-in-top');
    navLinks.forEach(item => {
        item.style.display = ''
        item.classList.add('fade-in-top');
    });
    loadCart();
    updateCartBadge();
    renderMenu();
    menuList.addEventListener('click', (e) => handleMenuButtonClick(e));
    snackList.addEventListener('click', (e) => handleMenuButtonClick(e));
    cartIcon.addEventListener('click', handleCartIconClick);
    cartOrderBtn.addEventListener('click', handleCartOrderClick); // Use handleCartOrderClick instead of inline submitOrder
    document.getElementById('payment-back-btn').addEventListener('click', handlePaymentBackClick);
    cartList.addEventListener('click', (e) => handleCartListClick(e));
    document.querySelector('.nav__list').addEventListener('click', e => {
        const link = e.target.closest('.nav__link');
        if (link) {
            e.preventDefault();
            setActiveSection(link.dataset.target);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    btnLookMenu.addEventListener('click', () => {
        setActiveSection('menu');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
window.onload = init;