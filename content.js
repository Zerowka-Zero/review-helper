(function() {
    // Создаем контейнер для нашего окна и позиционируем его с отступом от правого верхнего угла
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "50px";
    container.style.right = "50px";
    container.style.zIndex = "10000";
    document.body.appendChild(container);

    // Создаем Shadow DOM для изоляции стилей нашего окна
    const shadow = container.attachShadow({ mode: "open" });

    // Добавляем стили
    const style = document.createElement("style");
    style.textContent = `
    #extWindow {
      background: #333;
      color: #fff;
      padding: 10px;
      display: inline-block;
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.6);
      width: auto;
    }
    #extHeader {
      cursor: move;
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    .checkbox-row input[type="checkbox"] {
      margin-right: 5px;
    }
    #applyBtn {
      background: #555;
      color: #fff;
      border: none;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 3px;
      font-size: 13px;
      display: block;
      width: 100%;
      margin-bottom: 8px;
    }
    #applyBtn:hover {
      background: #666;
    }
    hr.separator {
      border: none;
      border-top: 1px solid #fff;
      margin: 8px 0;
    }
  `;
    shadow.appendChild(style);

    // Создаем разметку окна – кнопка "Применить" сверху, затем заголовок и контейнер для чекбоксов
    const extWindow = document.createElement("div");
    extWindow.id = "extWindow";
    extWindow.innerHTML = `
    <button id="applyBtn">Применить</button>
    <div id="extHeader">Ошибки</div>
    <div id="chkContainer">Загрузка...</div>
  `;
    shadow.appendChild(extWindow);

    // Делаем окно перетаскиваемым за заголовок
    (function makeDraggable(el) {
        const header = el.querySelector("#extHeader");
        let isDragging = false, offsetX, offsetY;
        header.addEventListener("mousedown", function(e) {
            isDragging = true;
            offsetX = e.clientX - el.getBoundingClientRect().left;
            offsetY = e.clientY - el.getBoundingClientRect().top;
        });
        document.addEventListener("mousemove", function(e) {
            if (isDragging) {
                container.style.left = (e.clientX - offsetX) + "px";
                container.style.top = (e.clientY - offsetY) + "px";
            }
        });
        document.addEventListener("mouseup", function() {
            isDragging = false;
        });
    })(extWindow);

    let lastTaskNumber = null;

    /**
     * Функция обновления чекбоксов для активного студента.
     * Поиск заголовка задания и ревью производится внутри текущего активного слайда (.carousel-item.active).
     */
    function updateCheckboxes() {
        const containerEl = shadow.getElementById("chkContainer");
        const activeItem = document.querySelector(".carousel-inner .carousel-item.active");
        if (!activeItem) {
            containerEl.innerHTML = "<em>Активный слайд не найден</em>";
            return;
        }
        const taskHeader = activeItem.querySelector("h3");
        if (!taskHeader) {
            containerEl.innerHTML = "<em>Заголовок задания не найден</em>";
            return;
        }
        const taskNum = taskHeader.textContent.trim();
        console.log("Task number:", taskNum);
        if (taskNum === lastTaskNumber) return;
        lastTaskNumber = taskNum;

        // Глобальный заголовок ревью (если он находится вне слайда)
        const globalReviewHeader = document.querySelector(".code-review-page-header h3");
        const reviewText = globalReviewHeader ? globalReviewHeader.textContent.trim() : "";
        console.log("Review text:", reviewText);

        const commonItems = window.commonErrors || [];
        const reviewErrors = (window.taskErrors && window.taskErrors[reviewText]) || {};
        const specificItems = reviewErrors[taskNum] || [];

        console.log("Common items:", commonItems);
        console.log("Specific items:", specificItems);

        containerEl.innerHTML = "";

        // Выводим сначала общие ошибки
        if (commonItems.length > 0) {
            commonItems.forEach(err => {
                const row = document.createElement("div");
                row.className = "checkbox-row";
                const chk = document.createElement("input");
                chk.type = "checkbox";
                chk.dataset.text = err.text;
                const lbl = document.createElement("label");
                lbl.textContent = err.label;
                row.appendChild(chk);
                row.appendChild(lbl);
                containerEl.appendChild(row);
            });
        }

        // Если и общие, и специфичные ошибки есть – добавляем разделитель
        if (commonItems.length > 0 && specificItems.length > 0) {
            const hr = document.createElement("hr");
            hr.className = "separator";
            containerEl.appendChild(hr);
        }

        // Выводим специфичные ошибки
        specificItems.forEach(err => {
            const row = document.createElement("div");
            row.className = "checkbox-row";
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.dataset.text = err.text;
            const lbl = document.createElement("label");
            lbl.textContent = err.label;
            row.appendChild(chk);
            row.appendChild(lbl);
            containerEl.appendChild(row);
        });
    }

    // Обновляем чекбоксы каждые 500 мс
    setInterval(updateCheckboxes, 500);

    /**
     * Обработчик кнопки "Применить"
     * Собираем выбранные ошибки, вставляем их в поле ввода внутри активного слайда,
     * генерируем событие input, кликаем по кнопке "Отправить комментарий",
     * и через небольшую задержку переключаемся на следующую задачу.
     */
    shadow.getElementById("applyBtn").addEventListener("click", function() {
        const activeItem = document.querySelector(".carousel-inner .carousel-item.active");
        if (!activeItem) {
            console.error("Активный слайд не найден");
            return;
        }

        // Ищем поле для комментария внутри активного слайда
        const errorField = activeItem.querySelector(".form-control.form-control-area");
        const checkboxes = shadow.querySelectorAll("#chkContainer input[type='checkbox']");

        if (errorField) {
            let newText = "";
            checkboxes.forEach(chk => {
                if (chk.checked) {
                    newText += chk.dataset.text + "\n";
                }
            });
            errorField.value = newText;
            const inputEvent = new Event("input", { bubbles: true });
            errorField.dispatchEvent(inputEvent);
        } else {
            console.error("Поле .form-control.form-control-area не найдено в активном слайде!");
        }

        // Ищем кнопку "Отправить комментарий" внутри активного слайда
        const sendBtn = activeItem.querySelector("button.btn.btn-info");
        if (sendBtn) {
            sendBtn.click();
        } else {
            console.log('Кнопка "Отправить комментарий" не найдена в активном слайде.');
        }

        // С задержкой переключаемся на следующую задачу внутри активного слайда
        setTimeout(() => {
            const currentTask = activeItem.querySelector('.code-review-tasks-list .student-task.current-task');
            if (currentTask) {
                const nextTask = currentTask.nextElementSibling;
                if (nextTask) {
                    nextTask.click();
                } else {
                    console.log("Следующая задача не найдена.");
                }
            } else {
                console.log("Текущая задача не найдена в активном слайде.");
            }
        }, 300);
    });
})();
