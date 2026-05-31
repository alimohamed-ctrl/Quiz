const API_URL = "https://script.google.com/macros/s/AKfycbxiIoAgbzsfWSc3lCwTW9Dv-TPKyvz0VbYh8fWc_iJPpXL5R9wp3pXpeWExQLvIhqOy4w/exec";
let quizQuestions = [];

// 1. جلب الأسئلة من جوجل شيت
async function loadQuiz() {
    try {
        const response = await fetch(API_URL);
        quizQuestions = await response.json();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('submit-btn').style.display = 'block';
        
        displayQuestions();
    } catch (error) {
        console.error("خطأ في جلب الأسئلة:", error);
        document.getElementById('loading').innerText = "عذراً، فشل الاتصال بالنظام لحمل الأسئلة. يرجى تحديث الصفحة.";
        document.getElementById('loading').style.color = "#ef4444";
    }
}

// 2. عرض الأسئلة بالتصميم الاحترافي الداكن
function displayQuestions() {
    const quizContainer = document.getElementById('quiz-container');
    quizContainer.innerHTML = "";
    
    quizQuestions.forEach((q, index) => {
        let optionsHTML = "";
        
        q.options.forEach(opt => {
            let cleanedOpt = opt.trim();
            if (cleanedOpt) {
                optionsHTML += `
                    <label class="option-label">
                        <input type="radio" name="q${index}" value="${cleanedOpt}">
                        <span>${cleanedOpt}</span>
                    </label>
                `;
            }
        });
        
        quizContainer.innerHTML += `
            <div class="question-block">
                <div class="question-title">السؤال ${index + 1}: ${q.question}</div>
                ${optionsHTML}
            </div>
        `;
    });
}

// 3. تصحيح التقرير التفصيلي وإرساله
async function submitQuiz() {
    const empName = document.getElementById('employee-name').value.trim();
    if (!empName) { 
        alert("تنبيه: يجب كتابة اسمك الكامل أولاً قبل تقديم الإجابات!"); 
        return; 
    }
    
    let answeredAll = true;
    let score = 0;
    let detailsArray = []; // لحفظ تفاصيل كل سؤال (صح أم خطأ)
    
    quizQuestions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        let questionNumber = index + 1;
        
        if (!selected) {
            answeredAll = false;
            detailsArray.push(`س${questionNumber}: لم يحل`);
        } else {
            let isCorrect = selected.value === q.answer.toString().trim();
            if (isCorrect) {
                score++;
                detailsArray.push(`س${questionNumber}: صح`);
            } else {
                detailsArray.push(`س${questionNumber}: خطأ`);
            }
        }
    });

    if (!answeredAll) {
        const confirmSubmit = confirm("لم تقم بحل جميع الأسئلة المطروحة، هل أنت متأكد من رغبتك في الإرسال؟");
        if (!confirmSubmit) return;
    }
    
    const finalResult = `${score} من ${quizQuestions.length}`;
    const reportDetails = detailsArray.join(" | "); // دمج التقرير ليصبح سطر واحد يفصل بينه علامة |
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "جاري تشفير وإرسال بياناتك...";
    submitBtn.disabled = true;

    try {
        // إرسال الاسم، الدرجة الإجمالية، والتقرير التفصيلي
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name: empName, 
                score: finalResult,
                details: reportDetails 
            })
        });
        
        alert(`ممتاز يا ${empName}، تم تسليم ورقة إجابتك بنجاح.\nالنتيجة الإجمالية: ${finalResult}`);
        
        // إعادة تهيئة لتجنب التكرار
        document.getElementById('employee-name').value = "";
        document.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
        
    } catch (error) {
        alert("خطأ في الاتصال بالسيرفر، لم يتم إرسال الإجابة. يرجى المحاولة مجدداً.");
        console.error(error);
    } finally {
        submitBtn.innerText = "إنهاء الاختبار وإرسال التقرير";
        submitBtn.disabled = false;
    }
}

window.onload = loadQuiz;
