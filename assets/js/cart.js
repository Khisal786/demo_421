document.addEventListener('DOMContentLoaded', () => {
  // Cart state
  let cart = JSON.parse(localStorage.getItem('taco_cart')) || [];
  updateCartBadge();

  // Modal elements
  const modalOverlay = document.getElementById('itemModal') || document.getElementById('pizzaModalOverlay');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const modalQtyEl = document.getElementById('modalQtyDisplay') || document.getElementById('modalQty');
  const confirmBtn = document.getElementById('confirmAddToCartBtn') || document.querySelector('.btn-add-cart');

  let currentSelectedItem = null;
  let currentQty = 1;

  // Expose function to open modal from menu cards
  window.openItemModal = function(itemData) {
    currentSelectedItem = itemData;
    currentQty = 1;
    if (modalQtyEl) modalQtyEl.textContent = currentQty;

    const titleEl = document.getElementById('modalTitle') || document.getElementById('modalItemName');
    const descEl = document.getElementById('modalDescription') || document.getElementById('modalItemDesc');
    const imgEl = document.getElementById('modalImage');

    if (titleEl) titleEl.textContent = itemData.name;
    if (descEl) descEl.textContent = itemData.description;
    if (imgEl && itemData.image) {
      imgEl.src = itemData.image;
    }
    
    // Render option groups (radios/checkboxes) if available
    const optionsContainer = document.getElementById('modalOptionsContainer') || document.getElementById('sizesOptionsContainer');
    if (optionsContainer) {
      optionsContainer.innerHTML = '';

      if (itemData.options && itemData.options.length > 0) {
        itemData.options.forEach((optGroup, groupIndex) => {
          let groupHtml = `<div class="opt-group" style="margin-bottom: 1rem;"><h5 style="color: #fff; margin-bottom: 0.5rem; font-size: 0.95rem;">${optGroup.name}</h5>`;
          optGroup.choices.forEach((choice, choiceIndex) => {
            const inputType = optGroup.type; // radio or checkbox
            const isChecked = (inputType === 'radio' && choiceIndex === 0) ? 'checked' : '';
            groupHtml += `
              <label class="opt-label" style="display: flex; align-items: center; justify-content: space-between; color: #ccc; font-size: 0.9rem; padding: 0.3rem 0; cursor: pointer;">
                <span>
                  <input type="${inputType}" name="opt_group_${groupIndex}" value="${choice.label}" data-price="${choice.price}" ${isChecked} onchange="calculateModalTotal()" style="margin-right: 8px;">
                  ${choice.label}
                </span>
                <span style="color: #ff5252; font-weight: 600;">${choice.price > 0 ? '+$' + choice.price.toFixed(2) : 'Free'}</span>
              </label>
            `;
          });
          groupHtml += `</div>`;
          optionsContainer.innerHTML += groupHtml;
        });
      }
    }

    calculateModalTotal();
    if (modalOverlay) modalOverlay.classList ? modalOverlay.classList.add('active') : modalOverlay.style.display = 'flex';
  };

  // Keep backward compatibility wrapper if any old calls exist
  window.openPizzaModal = window.openItemModal;

  window.calculateModalTotal = function() {
    if (!currentSelectedItem) return;
    let basePrice = currentSelectedItem.price || 0;
    
    // Add selected options prices
    const form = document.getElementById('modalOptionsForm') || document;
    const inputs = form.querySelectorAll('input:checked');
    inputs.forEach(input => {
      basePrice += parseFloat(input.getAttribute('data-price') || 0);
    });
    
    const totalPrice = basePrice * currentQty;
    const totalDisplay = document.getElementById('modalTotalPrice');
    if (totalDisplay) totalDisplay.textContent = '$' + totalPrice.toFixed(2);
  };

  // Quantity controls inside modal
  if (qtyPlus) {
    qtyPlus.onclick = () => { currentQty++; if (modalQtyEl) modalQtyEl.textContent = currentQty; calculateModalTotal(); };
  }
  if (qtyMinus) {
    qtyMinus.onclick = () => { if (currentQty > 1) { currentQty--; if (modalQtyEl) modalQtyEl.textContent = currentQty; calculateModalTotal(); } };
  }

  // Close Modal triggers
  window.closeItemModal = function() {
    if (modalOverlay) {
      modalOverlay.classList ? modalOverlay.classList.remove('active') : modalOverlay.style.display = 'none';
    }
  };
  window.closePizzaModal = window.closeItemModal;

  if (modalOverlay) {
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) window.closeItemModal(); };
  }

  // Confirm Add to Cart
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (!currentSelectedItem) return;

      // Collect selected modifiers/options
      let selectedOptionsText = [];
      let modifierCost = 0;

      const form = document.getElementById('modalOptionsForm') || document;
      const inputs = form.querySelectorAll('input:checked');
      inputs.forEach(input => {
        selectedOptionsText.push(input.value);
        modifierCost += parseFloat(input.getAttribute('data-price') || 0);
      });

      let unitPrice = (currentSelectedItem.price || 0) + modifierCost;

      const cartItem = {
        id: currentSelectedItem.id + '-' + selectedOptionsText.join('-'),
        name: currentSelectedItem.name,
        options: selectedOptionsText.join(', '),
        price: unitPrice,
        qty: currentQty
      };

      // Check existing item in cart
      const existingIndex = cart.findIndex(i => i.id === cartItem.id);
      if (existingIndex > -1) {
        cart[existingIndex].qty += currentQty;
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem('taco_cart', JSON.stringify(cart));
      updateCartBadge();
      window.closeItemModal();
    };
  }

  function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = totalCount;
  }

  // WhatsApp Cart Drawer Elements & Logic
  const openCartBtn = document.getElementById('openCartBtn');
  const cartOverlay = document.getElementById('whatsappCartOverlay');
  const closeCartModal = document.getElementById('closeCartModal');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartEmptyState = document.getElementById('cartEmptyState');
  const cartFooter = document.getElementById('cartFooter');
  const cartGrandTotal = document.getElementById('cartGrandTotal');
  const checkoutWhatsappBtn = document.getElementById('checkoutWhatsappBtn');

  if (openCartBtn && cartOverlay) {
    openCartBtn.onclick = () => {
      renderCartDrawer();
      cartOverlay.style.display = 'flex';
    };
  }

  if (closeCartModal) {
    closeCartModal.onclick = () => { cartOverlay.style.display = 'none'; };
  }

  if (cartOverlay) {
    cartOverlay.onclick = (e) => { if (e.target === cartOverlay) cartOverlay.style.display = 'none'; };
  }

  function renderCartDrawer() {
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    
    if (cart.length === 0) {
      if (cartEmptyState) cartEmptyState.style.display = 'block';
      if (cartFooter) cartFooter.style.display = 'none';
      return;
    }

    if (cartEmptyState) cartEmptyState.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'block';

    let grandTotal = 0;

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.qty;
      grandTotal += itemTotal;

      const div = document.createElement('div');
      div.className = 'cart-item-card';
      div.innerHTML = `
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.name}</h4>
          <p class="cart-item-meta">${item.options ? 'Options: ' + item.options : ''}</p>
          <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
        </div>
        <div class="cart-item-actions">
          <button type="button" onclick="adjustQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button type="button" onclick="adjustQty(${index}, 1)">+</button>
        </div>
      `;
      cartItemsList.appendChild(div);
    });

    if (cartGrandTotal) cartGrandTotal.textContent = `$${grandTotal.toFixed(2)}`;
  }

  window.adjustQty = function(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    localStorage.setItem('taco_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartDrawer();
  };

  // WhatsApp Checkout Trigger & Cleanup Workaround
  if (checkoutWhatsappBtn) {
    checkoutWhatsappBtn.onclick = () => {
      const customerNameInput = document.getElementById('customerName');
      const customerLocationInput = document.getElementById('customerTableOrAddress');
      
      const customerName = customerNameInput ? customerNameInput.value.trim() : 'Valued Customer';
      const customerLocation = customerLocationInput ? customerLocationInput.value.trim() : 'Takeout / Table';

      if (!customerName) {
        alert('Please enter your name to proceed.');
        if (customerNameInput) customerNameInput.focus();
        return;
      }

      if (cart.length === 0) return;

      let message = `🌮 *NEW STREET FOOD ORDER*%0A`;
      message += `👤 *Name:* ${customerName}%0A`;
      if (customerLocation) {
        message += `📍 *Table/Address:* ${customerLocation}%0A`;
      }
      message += `------------------------%0A`;

      let total = 0;
      cart.forEach((item) => {
        const itemSum = item.price * item.qty;
        total += itemSum;
        message += `• ${item.qty}x ${item.name}`;
        if (item.options) message += ` (${item.options})`;
        message += ` - $${itemSum.toFixed(2)}%0A`;
      });

      message += `------------------------%0A`;
      message += `💰 *Grand Total:* $${total.toFixed(2)}`;

      const whatsappNumber = "923049999325"; 
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      
      window.open(whatsappUrl, '_blank');

      cart = [];
      localStorage.removeItem('taco_cart');
      updateCartBadge();

      if (cartOverlay) cartOverlay.style.display = 'none';

      showOrderNotification();
    };
  }

  function showOrderNotification() {
    let existingToast = document.getElementById('orderToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'orderToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #18181b;
      color: #fafafa;
      border: 1px solid #ff5252;
      padding: 14px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 9999;
      font-size: 13px;
      text-align: center;
      max-width: 90%;
      width: 340px;
      line-height: 1.45;
    `;
    toast.innerHTML = `🔥 <strong>Order Dispatched!</strong><br><span style="color: #a1a1aa; font-size: 12px; display: block; margin-top: 4px;">Once you send your order in WhatsApp, you can tap back to your browser to view your active order summary.</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.6s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 600);
    }, 8000);
  }

  // Category Pills Filtering & Smooth Scrolling Logic
  const pillBtns = document.querySelectorAll('.pill-btn');
  pillBtns.forEach(btn => {
    btn.onclick = () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const targetId = btn.getAttribute('data-category');
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const headerOffset = 110; 
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    };
  });
});