const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let quizQuestions = [];

// 1. جلب الأسئلة فوراً من جوجل شيت عند فتح الموقع
async function loadQuiz() {
    try {
        const response = await fetch(API_URL);
        quizQuestions = await response.json();
        
        // إخفاء كلمة جاري التحميل وإظهار زر الإرسال
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'block';
        
        displayQuestions();
    } catch (error) {
        console.error("خطأ في جلب الأسئلة:", error);
        document.getElementById('loading').innerText = "فشل تحميل الأسئلة، يرجى إعادة تحديث الصفحة.";
    }
}

// 2. دالة لعرض الأسئلة في الصفحة بشكل منظم
function displayQuestions() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = ""; // تفريغ المكان
    
    quizQuestions.forEach((q, index) => {
        let optionsHTML = "";
        
        q.options.forEach(opt => {
            let cleanedOpt = opt.trim();
            if (cleanedOpt) { // التأكد من أن الاختيار ليس فارغاً
                optionsHTML += `
                    <label class="option-label">
                        <input type="radio" name="q${index}" value="${cleanedOpt}">
                        ${cleanedOpt}
                    </label>
                `;
            }
        });
        
        quizContainer.innerHTML += `
            <div class="question-block">
                <h3>السؤال ${index + 1}: ${q.question}</h3>
                ${optionsHTML}
            </div>
        `;
    });
}

// 3. تصحيح الاختبار وإرسال النتيجة لجوجل شيت
async function submitQuiz() {
    const empName = document.getElementById('employee-name').value.trim();
    if (!empName) { 
        alert("من فضلك أدخل اسمك أولاً قبل إرسال الاختبار!"); 
        return; 
    }
    
    // التأكد من أن الموظف أجاب على الأسئلة
    let answeredAll = true;
    let score = 0;
    
    quizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (!selected) {
            answeredAll = false;
        } else if (selected.value === q.answer.toString().trim()) {
            score++;
        }
    });

    if (!answeredAll) {
        const confirmSubmit = confirm("لم تقم بالإجابة على جميع الأسئلة، هل تريد الإرسال على أي حال؟");
        if (!confirmSubmit) return;
    }
    
    const finalResult = `${score} من ${quizQuestions.length}`;
    
    // تغيير شكل الزر أثناء الإرسال لمنع الضغط المتكرر
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "جاري إرسال النتيجة...";
    submitBtn.disabled = true;

    try {
        // إرسال النتيجة لجوجل شيت
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: empName, score: finalResult })
        });
        
        alert(`شكراً لك يا ${empName}، تم تسجيل وإرسال نتيجتك بنجاح!\nدرجتك هي: ${finalResult}`);
        
        // إعادة تصفير النموذج
        document.getElementById('employee-name').value = "";
        const allInputs = document.querySelectorAll('input[type="radio"]');
        allInputs.forEach(input => input.checked = false);
        
    } catch (error) {
        alert("حدث خطأ أثناء إرسال النتيجة، يرجى المحاولة مرة أخرى.");
        console.error(error);
    } finally {
        submitBtn.innerText = "إرسال الإجابات وإنهاء الاختبار";
        submitBtn.disabled = false;
    }
}

// تشغيل جلب الأسئلة أول ما الموقع يفتح
window.onload = loadQuiz;
