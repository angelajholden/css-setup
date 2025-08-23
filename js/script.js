const body = document.querySelector("body");
const buttons = document.querySelectorAll(".menu_button");
const open = document.querySelector(".open_button");
const nav = document.querySelector(".navigation");

function toggleMenu() {
	buttons.forEach((button) => {
		button.addEventListener("click", () => {
			nav.classList.toggle("active");
			const isActive = body.classList.toggle("menu_active");
			if (isActive) {
				open.setAttribute("aria-expanded", "true");
			} else {
				open.setAttribute("aria-expanded", "false");
			}
		});
	});
}

function escapeMenu() {
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && body.classList.contains("menu_active")) {
			body.classList.remove("menu_active");
			open.setAttribute("aria-expanded", "false");
		}
	});
}

// Global variable to hold all products
let allProducts = [];
let filteredProducts = [];
let itemsToShow = 9;
let currentIndex = 0;
function getProducts(products, reset = false) {
	const grid = document.getElementById("products");
	if (!grid) return;
	if (reset) {
		grid.innerHTML = "";
		currentIndex = 0;
	}
	const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
	const toDisplay = products.slice(currentIndex, currentIndex + itemsToShow);
	toDisplay.forEach((product) => {
		const article = document.createElement("article");
		article.classList.add("product");
		let displayPrice = `${fmt.format(product.price)}`;
		if (product.sale && product.discount) {
			const salePrice = product.price - product.price * (product.discount / 100);
			displayPrice = `<span class="sale">${fmt.format(salePrice)}</span><span class="regular">${fmt.format(product.price)}</span>`;
		}
		article.innerHTML = `
			<figure class="figure">
				<img loading="lazy" src="images/${product.image}" alt="${product.alt}" />
			</figure>
			<h2 class="product-heading">${product.name}</h2>
			<p>${displayPrice}</p>
		`;
		grid.appendChild(article);
	});
	currentIndex += toDisplay.length;
	// Show/hide Load More button
	const loadMoreBtn = document.getElementById("load_more");
	if (loadMoreBtn) {
		if (currentIndex >= products.length) {
			loadMoreBtn.classList.remove("more_active");
		} else {
			loadMoreBtn.classList.add("more_active");
		}
	}
	// Update counts for 'Showing _ - _ of _ results'
	const firstItemEl = document.querySelectorAll(".first_item").forEach((el) => (el.textContent = products.length === 0 ? 0 : 1));
	const lastItemEl = document.querySelectorAll(".last_item").forEach((el) => (el.textContent = currentIndex));
	const totalItemsEl = document.querySelectorAll(".total_items").forEach((el) => (el.textContent = products.length));
	if (firstItemEl) firstItemEl.textContent = products.length === 0 ? 0 : 1;
	if (lastItemEl) lastItemEl.textContent = currentIndex;
	if (totalItemsEl) totalItemsEl.textContent = products.length;
}

function getCheckedFilters() {
	const checkedCategories = Array.from(document.querySelectorAll('#category_filter input[type="checkbox"]:checked')).map((i) => i.value);
	const checkedColors = Array.from(document.querySelectorAll('#color_filter input[type="checkbox"]:checked')).map((i) => i.value);
	return { checkedCategories, checkedColors };
}

function filterProducts() {
	const { checkedCategories, checkedColors } = getCheckedFilters();
	const searchInput = document.getElementById("search");
	const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
	filteredProducts = allProducts.filter((product) => {
		let categoryMatch = checkedCategories.length === 0 || checkedCategories.every((cat) => product.category.includes(cat));
		let colorMatch = checkedColors.length === 0 || checkedColors.every((col) => product.colors.includes(col));
		let searchMatch = searchTerm === "" || product.name.toLowerCase().includes(searchTerm);
		return categoryMatch && colorMatch && searchMatch;
	});
	getProducts(filteredProducts, true);
}

function createFilters(params) {
	const filterSection = document.getElementById("filters");
	if (!filterSection) return;
	const categoryList = document.getElementById("category_filter");
	const colorList = document.getElementById("color_filter");
	if (!categoryList || !colorList) return;

	params.categories.forEach((category) => {
		const listItem = document.createElement("li");
		const input = document.createElement("input");
		input.type = "checkbox";
		// input.id = `filter-category-${category}`;
		input.name = "category";
		input.value = category;

		const label = document.createElement("label");
		// label.setAttribute("for", input.id);
		label.textContent = category.charAt(0).toUpperCase() + category.slice(1);

		label.prepend(input);
		listItem.appendChild(label);

		categoryList.appendChild(listItem);
	});

	params.colors.forEach((color) => {
		const listItem = document.createElement("li");
		const input = document.createElement("input");
		input.type = "checkbox";
		input.id = `filter-color-${color}`;
		input.name = "color";
		input.value = color;

		const label = document.createElement("label");
		label.setAttribute("for", input.id);
		label.textContent = color.charAt(0).toUpperCase() + color.slice(1);

		listItem.appendChild(input);
		listItem.appendChild(label);

		colorList.appendChild(listItem);
	});

	// filterSection.classList.add("active");

	const categoryInputs = filterSection.querySelectorAll('#category_filter input[type="checkbox"]');
	const colorInputs = filterSection.querySelectorAll('#color_filter input[type="checkbox"]');
	categoryInputs.forEach((input) => input.addEventListener("change", filterProducts));
	colorInputs.forEach((input) => input.addEventListener("change", filterProducts));

	// Add search input listener
	const searchInput = document.getElementById("search");
	if (searchInput) {
		searchInput.addEventListener("input", filterProducts);
	}
}

function initProductsAndFilters() {
	fetch("../json/products.json")
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		})
		.then((products) => {
			allProducts = products.sort((a, b) => a.name.localeCompare(b.name));
			filteredProducts = allProducts;
			getProducts(filteredProducts, true);

			const categories = [...new Set(products.flatMap((product) => product.category))].sort();
			const colors = [...new Set(products.flatMap((product) => product.colors))].sort();
			createFilters({ categories, colors });

			// Load More button
			const loadMoreBtn = document.getElementById("load_more");
			if (loadMoreBtn) {
				loadMoreBtn.addEventListener("click", () => {
					getProducts(filteredProducts);
				});
			}
		})
		.catch((err) => {
			console.error("Failed to load products: ", err);
		});
}

function setupResetButton() {
	const resetBtn = document.getElementById("reset_filter");
	if (resetBtn) {
		resetBtn.addEventListener("click", () => {
			const categoryInputs = document.querySelectorAll('#category_filter input[type="checkbox"]');
			const colorInputs = document.querySelectorAll('#color_filter input[type="checkbox"]');
			categoryInputs.forEach((input) => (input.checked = false));
			colorInputs.forEach((input) => (input.checked = false));
			// Clear search input
			const searchInput = document.getElementById("search");
			if (searchInput) {
				searchInput.value = "";
			}
			// Reset sort select to A-Z
			const sortSelect = document.getElementById("sort_products");
			if (sortSelect) {
				sortSelect.value = "az";
				sortProducts("az");
			}
			filterProducts();
		});
	}
}

function setupSortUI() {
	const sortSelect = document.getElementById("sort_products");
	if (sortSelect) {
		sortSelect.addEventListener("change", function (e) {
			sortProducts(e.target.value);
		});
	}
}

function sortProducts(type) {
	// Use filteredProducts if available, else allProducts
	let products = filteredProducts && filteredProducts.length ? filteredProducts : allProducts;
	switch (type) {
		case "az":
			products = products.slice().sort((a, b) => a.name.localeCompare(b.name));
			break;
		case "za":
			products = products.slice().sort((a, b) => b.name.localeCompare(a.name));
			break;
		case "lowhigh":
			products = products.slice().sort((a, b) => a.price - b.price);
			break;
		case "highlow":
			products = products.slice().sort((a, b) => b.price - a.price);
			break;
		default:
			// No sort or default sort
			break;
	}
	// Reset display and show sorted products
	getProducts(products, true);
	// Update filteredProducts so pagination works
	filteredProducts = products;
}

document.addEventListener("DOMContentLoaded", () => {
	toggleMenu();
	escapeMenu();
	initProductsAndFilters();
	setupResetButton();
	setupSortUI();
});
