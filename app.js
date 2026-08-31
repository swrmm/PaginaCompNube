        (() => {
            const STORAGE_KEY = "paginaCompNube.products.v1";
            const screens = document.querySelectorAll(".screen");
            const form = document.querySelector("#product-form");
            const message = document.querySelector("#form-message");
            const productList = document.querySelector("#products-list");
            const productsCount = document.querySelector("#products-count");
            const formTitle = document.querySelector("#register-title");
            const formIntro = document.querySelector("#form-intro");
            const saveButton = document.querySelector("#save-product");
            const cancelEditButton = document.querySelector("#cancel-edit");
            let editingProductId = null;

            // Esta capa se puede cambiar luego por Firebase, Supabase o Google Sheets.
            const repository = {
                getAll() {
                    try {
                        const products = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
                        return Array.isArray(products) ? products : [];
                    } catch {
                        return [];
                    }
                },
                save(product) {
                    const products = this.getAll();
                    products.unshift(product);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
                },
                update(id, changes) {
                    const products = this.getAll().map((product) =>
                        product.id === id ? { ...product, ...changes, updatedAt: new Date().toISOString() } : product
                    );
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
                },
                remove(id) {
                    const products = this.getAll().filter((product) => product.id !== id);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
                }
            };

            function formatPrice(price) {
                return new Intl.NumberFormat("es-CL", {
                    style: "currency",
                    currency: "CLP",
                    maximumFractionDigits: 0
                }).format(price);
            }

            function renderProducts() {
                const products = repository.getAll();
                const total = products.length;
                productsCount.textContent = `${total} ${total === 1 ? "producto registrado" : "productos registrados"}.`;
                productList.replaceChildren();

                if (!total) {
                    const emptyMessage = document.createElement("p");
                    emptyMessage.className = "empty-message";
                    emptyMessage.textContent = "No hay productos registrados.";
                    productList.append(emptyMessage);
                    return;
                }

                products.forEach((product) => {
                    const item = document.createElement("article");
                    item.className = "product-item";

                    const name = document.createElement("h3");
                    name.textContent = product.name;
                    const description = document.createElement("p");
                    description.textContent = product.description;
                    const price = document.createElement("span");
                    price.className = "product-price";
                    price.textContent = formatPrice(product.price);

                    const actions = document.createElement("div");
                    actions.className = "product-actions";
                    const editButton = document.createElement("button");
                    editButton.type = "button";
                    editButton.className = "product-action";
                    editButton.dataset.action = "edit";
                    editButton.dataset.id = product.id;
                    editButton.textContent = "Editar";
                    const deleteButton = document.createElement("button");
                    deleteButton.type = "button";
                    deleteButton.className = "product-action delete-button";
                    deleteButton.dataset.action = "delete";
                    deleteButton.dataset.id = product.id;
                    deleteButton.textContent = "Eliminar";
                    actions.append(editButton, deleteButton);

                    item.append(name, description, price, actions);
                    productList.append(item);
                });
            }

            function setError(field, text) {
                document.querySelector(`#${field}-error`).textContent = text;
            }

            function showMessage(text, type) {
                message.textContent = text;
                message.className = `message visible ${type}`;
            }

            function resetEditMode() {
                editingProductId = null;
                formTitle.textContent = "Registrar producto";
                formIntro.textContent = "Los productos se guardan localmente en este navegador.";
                saveButton.textContent = "Guardar producto";
                cancelEditButton.hidden = true;
            }

            function startEdit(id) {
                const product = repository.getAll().find((item) => item.id === id);
                if (!product) return;

                editingProductId = id;
                form.elements.name.value = product.name;
                form.elements.description.value = product.description;
                form.elements.price.value = product.price;
                formTitle.textContent = "Editar producto";
                formIntro.textContent = "Modifica los datos y guarda los cambios.";
                saveButton.textContent = "Guardar cambios";
                cancelEditButton.hidden = false;
                window.location.hash = "#registro";
                window.setTimeout(() => form.elements.name.focus(), 0);
            }

            function navigate() {
                const requestedScreen = window.location.hash.slice(1) || "inicio";
                const screenId = document.getElementById(requestedScreen) ? requestedScreen : "inicio";

                if (screenId !== "registro" && editingProductId) {
                    form.reset();
                    resetEditMode();
                }

                screens.forEach((screen) => {
                    screen.classList.toggle("active", screen.id === screenId);
                });
                renderProducts();
            }

            form.addEventListener("submit", (event) => {
                event.preventDefault();
                ["name", "description", "price"].forEach((field) => setError(field, ""));
                message.className = "message";

                const name = form.elements.name.value.trim();
                const description = form.elements.description.value.trim();
                const priceText = form.elements.price.value.trim();
                const price = Number(priceText);
                let firstInvalidField = null;

                if (name.length < 2) {
                    setError("name", "Ingresa un nombre de al menos 2 caracteres.");
                    firstInvalidField ??= form.elements.name;
                }
                if (description.length < 8) {
                    setError("description", "Agrega una descripción de al menos 8 caracteres.");
                    firstInvalidField ??= form.elements.description;
                }
                if (!priceText || !Number.isFinite(price) || price < 0) {
                    setError("price", "Ingresa un precio válido igual o mayor que cero.");
                    firstInvalidField ??= form.elements.price;
                }

                if (firstInvalidField) {
                    showMessage("Revisa los campos marcados antes de guardar.", "error");
                    firstInvalidField.focus();
                    return;
                }

                try {
                    const productData = {
                        name,
                        description,
                        price
                    };

                    if (editingProductId) {
                        repository.update(editingProductId, productData);
                        showMessage("Producto actualizado correctamente.", "success");
                    } else {
                        repository.save({
                            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                            ...productData,
                            createdAt: new Date().toISOString()
                        });
                        showMessage("Producto guardado correctamente.", "success");
                    }
                    form.reset();
                    resetEditMode();
                    renderProducts();
                } catch {
                    showMessage("No pudimos guardar el producto en este navegador.", "error");
                }
            });

            cancelEditButton.addEventListener("click", () => {
                form.reset();
                message.className = "message";
                resetEditMode();
                window.location.hash = "#productos";
            });

            productList.addEventListener("click", (event) => {
                const actionButton = event.target.closest("button[data-action]");
                if (!actionButton) return;

                const { action, id } = actionButton.dataset;
                if (action === "edit") {
                    startEdit(id);
                    return;
                }

                const product = repository.getAll().find((item) => item.id === id);
                if (product && window.confirm(`¿Eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`)) {
                    repository.remove(id);
                    renderProducts();
                }
            });

            window.addEventListener("hashchange", navigate);
            navigate();
        })();
