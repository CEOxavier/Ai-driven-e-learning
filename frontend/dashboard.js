(function attachDashboard(window, document) {
  "use strict";

  const api = window.AILearnAPI;
  const COMPLETED_KEY = "aiLearnCompletedTopics";
  const SCORE_KEY = "aiLearnScores";

  const learningPaths = {
    Python: [
      {
        title: "Variables",
        text:
          "A Python variable is a name that stores data. Think of it as a labeled container: the label stays the same, but the value inside can change as your program runs.",
        code: 'name = "John"\nage = 25\n\nprint(name)\nprint(age)',
        quiz: {
          question: "Which syntax creates a variable in Python?",
          options: ["var name = John", "let name = John", 'name = "John"', "const name = John"],
          correct: 2,
        },
      },
      {
        title: "Loops",
        text:
          "A loop repeats a block of code while a condition is true or while there are items left to process. Python commonly uses for loops for sequences and while loops for conditions.",
        code: 'fruits = ["apple", "banana", "cherry"]\n\nfor fruit in fruits:\n    print(fruit)',
        quiz: {
          question: "Which loop is best for iterating over a Python list?",
          options: ["for", "repeat", "switch", "case"],
          correct: 0,
        },
      },
      {
        title: "Functions",
        text:
          "A function is a reusable block of code. It can receive inputs called parameters, perform work, and return a result.",
        code: 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Student"))',
        quiz: {
          question: "Which keyword defines a function in Python?",
          options: ["func", "function", "def", "define"],
          correct: 2,
        },
      },
      {
        title: "OOP",
        text:
          "Object-Oriented Programming organizes code into objects that combine data and behavior. It helps model real-world concepts like users, carts, and bank accounts.",
        code: 'class Account:\n    def __init__(self, owner):\n        self.owner = owner\n\naccount = Account("Ada")\nprint(account.owner)',
        quiz: {
          question: "What does OOP mainly organize code around?",
          options: ["Objects", "Only numbers", "File names", "CSS selectors"],
          correct: 0,
        },
      },
      {
        title: "Classes",
        text:
          "A class is a blueprint for creating objects. Each object can keep its own data while sharing methods from the class.",
        code: 'class Dog:\n    def __init__(self, name):\n        self.name = name\n\nmy_dog = Dog("Buddy")\nprint(my_dog.name)',
        quiz: {
          question: "A class is best described as what?",
          options: ["A loop", "A blueprint", "A package manager", "A compiler"],
          correct: 1,
        },
      },
      {
        title: "File I/O",
        text:
          "File input/output lets programs write information to files and read it later. This is useful for logs, settings, reports, and saved data.",
        code: 'with open("notes.txt", "w") as file:\n    file.write("Hello World")\n\nwith open("notes.txt", "r") as file:\n    print(file.read())',
        quiz: {
          question: "Which Python function opens a file?",
          options: ["readfile()", "open()", "file()", "load()"],
          correct: 1,
        },
      },
      {
        title: "Modules",
        text:
          "A module is a file of reusable Python code. You use import statements to bring built-in or custom module features into your program.",
        code: "import math\n\nprint(math.sqrt(16))\nprint(round(math.pi, 2))",
        quiz: {
          question: "Which keyword brings a module into Python code?",
          options: ["include", "using", "import", "module"],
          correct: 2,
        },
      },
    ],
    JavaScript: [
      {
        title: "JS Syntax",
        text:
          "JavaScript syntax is the set of rules for writing valid statements. Modern JavaScript commonly uses let and const for variables.",
        code: 'const platform = "AI Learn";\nlet lessons = 5;\n\nconsole.log(`${platform}: ${lessons} lessons ready`);',
        quiz: {
          question: "Which keyword declares a block-scoped JavaScript variable?",
          options: ["let", "def", "variety", "className"],
          correct: 0,
        },
      },
      {
        title: "JS Operators",
        text:
          "Operators assign, compare, and calculate values. JavaScript includes arithmetic operators, comparison operators, and logical operators.",
        code: 'const sum = 10 + 20;\nconst isReady = sum === 30;\n\nconsole.log(sum);\nconsole.log(isReady);',
        quiz: {
          question: "Which operator checks strict equality in JavaScript?",
          options: ["=", "==", "===", "=>"],
          correct: 2,
        },
      },
      {
        title: "JS If Else",
        text:
          "Conditional statements let your code choose different actions. if runs one block when a condition is true, and else handles the alternative.",
        code: 'const hour = 15;\n\nif (hour < 12) {\n  console.log("Good morning");\n} else {\n  console.log("Good afternoon");\n}',
        quiz: {
          question: "What does else handle?",
          options: ["A failed condition", "A CSS rule", "A module import", "A loop count"],
          correct: 0,
        },
      },
      {
        title: "JS Loops",
        text:
          "Loops execute code repeatedly. A for loop is useful when you know the range or collection you want to iterate over.",
        code: 'for (let index = 0; index < 5; index++) {\n  console.log(`Iteration ${index}`);\n}',
        quiz: {
          question: "What is the purpose of a loop?",
          options: ["Repeat code", "Hash passwords", "Style a page", "Install packages"],
          correct: 0,
        },
      },
      {
        title: "JS Strings",
        text:
          "Strings store text. JavaScript strings can use single quotes, double quotes, or template literals for embedded values.",
        code: 'const tech = "AI";\nconst message = `Welcome to ${tech} Learn`;\n\nconsole.log(message.toUpperCase());',
        quiz: {
          question: "Which string form supports ${value} interpolation?",
          options: ["Template literal", "Plain object", "Array", "Boolean"],
          correct: 0,
        },
      },
      {
        title: "JS Numbers",
        text:
          "JavaScript has one main Number type for integers and decimals. The Math object provides common numeric helpers.",
        code: "const value = 3.14;\n\nconsole.log(Math.round(value));\nconsole.log(typeof value);",
        quiz: {
          question: "Which object provides numeric helpers like round()?",
          options: ["NumberPad", "Math", "Console", "Window"],
          correct: 1,
        },
      },
      {
        title: "JS Functions",
        text:
          "A JavaScript function is a reusable block of code that runs when called. It can receive parameters and return a value.",
        code: "function multiply(a, b) {\n  return a * b;\n}\n\nconsole.log(multiply(4, 3));",
        quiz: {
          question: "What can a function return?",
          options: ["A value", "Only a CSS file", "Only an image", "Nothing ever"],
          correct: 0,
        },
      },
    ],
    Java: [
      {
        title: "Java Type Casting",
        text:
          "Type casting converts a value from one type to another. Java can widen some values automatically, but narrowing conversions must be explicit.",
        code: "public class Main {\n  public static void main(String[] args) {\n    int myInt = 9;\n    double myDouble = myInt;\n    System.out.println(myDouble);\n  }\n}",
        quiz: {
          question: "Which cast is explicit narrowing?",
          options: ["double value = 9", "int value = (int) 3.14", "String value = int", "boolean value = 1"],
          correct: 1,
        },
      },
      {
        title: "Java Operators",
        text:
          "Java operators perform arithmetic, assignment, comparison, and logical operations on variables and values.",
        code: "public class Main {\n  public static void main(String[] args) {\n    int x = 10;\n    x += 5;\n    System.out.println(x > 10 && x < 20);\n  }\n}",
        quiz: {
          question: "Which operator means logical AND in Java?",
          options: ["&&", "||", "++", "=="],
          correct: 0,
        },
      },
      {
        title: "Java Strings",
        text:
          "A Java String is an object with methods for working with text, including length(), toUpperCase(), and indexOf().",
        code: 'public class Main {\n  public static void main(String[] args) {\n    String greeting = "Hello AI Learn";\n    System.out.println(greeting.toUpperCase());\n  }\n}',
        quiz: {
          question: "Which method returns a string length?",
          options: ["size()", "length()", "count()", "total()"],
          correct: 1,
        },
      },
      {
        title: "Java Math",
        text:
          "The Java Math class provides common helpers such as max(), sqrt(), round(), and random().",
        code: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(Math.max(5, 10));\n    System.out.println(Math.sqrt(16));\n  }\n}",
        quiz: {
          question: "Which class provides sqrt()?",
          options: ["String", "Math", "System", "Array"],
          correct: 1,
        },
      },
      {
        title: "Java Booleans",
        text:
          "A boolean can only be true or false. Booleans are central to conditionals and comparisons.",
        code: "public class Main {\n  public static void main(String[] args) {\n    boolean isJavaFun = true;\n    System.out.println(isJavaFun);\n    System.out.println(10 > 9);\n  }\n}",
        quiz: {
          question: "Which values can a Java boolean store?",
          options: ["true or false", "any text", "only 0", "only null"],
          correct: 0,
        },
      },
      {
        title: "Java If...Else",
        text:
          "Java uses if, else if, and else to run different code blocks depending on conditions.",
        code: "public class Main {\n  public static void main(String[] args) {\n    int time = 20;\n    if (time < 18) {\n      System.out.println(\"Good day\");\n    } else {\n      System.out.println(\"Good evening\");\n    }\n  }\n}",
        quiz: {
          question: "What runs when the if condition is false?",
          options: ["else block", "package line", "import only", "compiler name"],
          correct: 0,
        },
      },
      {
        title: "Java Switch",
        text:
          "A switch statement chooses one matching case from many options. break stops execution from falling through to later cases.",
        code: "public class Main {\n  public static void main(String[] args) {\n    int day = 4;\n    switch (day) {\n      case 4:\n        System.out.println(\"Thursday\");\n        break;\n      default:\n        System.out.println(\"Another day\");\n    }\n  }\n}",
        quiz: {
          question: "What keyword exits a switch case?",
          options: ["stop", "break", "exit", "returncase"],
          correct: 1,
        },
      },
    ],
    "C++": [
      {
        title: "C++ Intro",
        text:
          "C++ is a high-performance language used for systems, games, tools, and applications that need strong control over memory and runtime behavior.",
        code: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World!";\n  return 0;\n}',
        quiz: {
          question: "Which function is the entry point of most C++ programs?",
          options: ["start()", "main()", "run()", "entry()"],
          correct: 1,
        },
      },
      {
        title: "C++ Syntax",
        text:
          "C++ statements usually end with semicolons. A complete program commonly includes headers and a main() function.",
        code: '#include <iostream>\n\nint main() {\n  std::cout << "AI Learn";\n  return 0;\n}',
        quiz: {
          question: "What commonly ends a C++ statement?",
          options: [";", ":", ".", ","],
          correct: 0,
        },
      },
      {
        title: "C++ Output",
        text:
          "std::cout sends output to the console. The insertion operator << passes values into the output stream.",
        code: '#include <iostream>\n\nint main() {\n  std::cout << "Learning C++ is fun." << std::endl;\n  return 0;\n}',
        quiz: {
          question: "Which object prints output in C++?",
          options: ["std::cin", "std::cout", "print", "Console.log"],
          correct: 1,
        },
      },
      {
        title: "C++ Comments",
        text:
          "Comments explain code without running. Single-line comments start with // and block comments use /* and */.",
        code: '#include <iostream>\n\nint main() {\n  // This line prints text\n  std::cout << "Comment example";\n  return 0;\n}',
        quiz: {
          question: "Which starts a single-line C++ comment?",
          options: ["//", "#", "<!--", "--"],
          correct: 0,
        },
      },
      {
        title: "C++ Variables",
        text:
          "C++ variables must have a declared type, such as int, double, char, bool, or std::string.",
        code: '#include <iostream>\n#include <string>\n\nint main() {\n  int age = 25;\n  std::string name = "Ada";\n  std::cout << name << " is " << age;\n  return 0;\n}',
        quiz: {
          question: "Which type stores whole numbers?",
          options: ["int", "double", "string", "char"],
          correct: 0,
        },
      },
      {
        title: "C++ User Input",
        text:
          "std::cin reads user input from the console. Values are stored in variables using the extraction operator >>.",
        code: '#include <iostream>\n\nint main() {\n  int x = 7;\n  std::cout << "Your number is: " << x;\n  return 0;\n}',
        quiz: {
          question: "Which object reads console input in C++?",
          options: ["std::cin", "std::cout", "input()", "Scanner"],
          correct: 0,
        },
      },
      {
        title: "C++ Data Types",
        text:
          "Data types tell the compiler what kind of value a variable stores and how much memory it may need.",
        code: '#include <iostream>\n\nint main() {\n  int count = 5;\n  double price = 9.98;\n  bool active = true;\n  std::cout << count << " " << price << " " << active;\n  return 0;\n}',
        quiz: {
          question: "Which type stores true or false?",
          options: ["double", "bool", "char", "long"],
          correct: 1,
        },
      },
    ],
    Go: [
      {
        title: "Go Variables",
        text:
          "Go variables can be declared with var or with the short declaration operator := inside functions.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  studentName := "Xavier"\n  age := 21\n  fmt.Println(studentName, age)\n}',
        quiz: {
          question: "Which operator is Go's short variable declaration?",
          options: [":=", "==", "=>", "::"],
          correct: 0,
        },
      },
      {
        title: "Go Constants",
        text:
          "Constants are fixed values declared with const. They cannot be reassigned after declaration.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  const platform = "AI Learn"\n  fmt.Println(platform)\n}',
        quiz: {
          question: "Which keyword declares a constant in Go?",
          options: ["const", "fixed", "let", "final"],
          correct: 0,
        },
      },
      {
        title: "Go Output",
        text:
          "Go uses the fmt package for formatted output. Println adds a new line, while Printf supports formatting verbs.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  name := "John"\n  fmt.Println("Hello", name)\n  fmt.Printf("Type: %T\\n", name)\n}',
        quiz: {
          question: "Which package commonly prints output in Go?",
          options: ["fmt", "console", "ioout", "print"],
          correct: 0,
        },
      },
      {
        title: "Go Data Types",
        text:
          "Go is statically typed. Common types include int, float64, string, and bool.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  var a int = 5\n  var b float64 = 2.5\n  fmt.Println(float64(a) + b)\n}',
        quiz: {
          question: "Which Go type commonly stores decimal numbers?",
          options: ["float64", "string", "bool", "bytecode"],
          correct: 0,
        },
      },
      {
        title: "Go Arrays",
        text:
          "A Go array has a fixed length. Once created, its size does not grow or shrink.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fruits := [3]string{"Apple", "Banana", "Cherry"}\n  fmt.Println(fruits[0])\n}',
        quiz: {
          question: "What is fixed in a Go array?",
          options: ["Length", "Package name", "Console color", "Compiler path"],
          correct: 0,
        },
      },
      {
        title: "Go Slices",
        text:
          "Slices are flexible views over arrays. They can grow with append(), making them more common than arrays in everyday Go.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  numbers := []int{1, 2, 3}\n  numbers = append(numbers, 4)\n  fmt.Println(numbers)\n}',
        quiz: {
          question: "Which function adds items to a Go slice?",
          options: ["append", "push", "insertAt", "addLast"],
          correct: 0,
        },
      },
      {
        title: "Go Operators",
        text:
          "Go supports arithmetic, comparison, and assignment operators. The ++ operator increments a numeric variable by one.",
        code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  x := 10\n  x++\n  fmt.Println(x == 11)\n}',
        quiz: {
          question: "Which operator increments a Go integer by one?",
          options: ["++", "+=", "**", "inc"],
          correct: 0,
        },
      },
    ],
  };

  const state = {
    language: "Python",
    topic: "Variables",
    completed: loadCompleted(),
    scores: loadScores(),
  };

  const elements = {};

  function cacheElements() {
    [
      "profileName",
      "dashboardNavToggle",
      "dashboardNavMenu",
      "logoutBtn",
      "skillList",
      "progressText",
      "progressBar",
      "lessonLanguage",
      "lessonTitle",
      "lessonText",
      "lessonCode",
      "downloadPdfBtn",
      "codeEditor",
      "lineNumbers",
      "runCodeBtn",
      "explainCodeBtn",
      "fixCodeBtn",
      "outputBox",
      "quizIntro",
      "quizQuestions",
      "quizQuestionNumber",
      "quizTopicBadge",
      "activeQuestionText",
      "quizOptions",
      "quizFeedback",
      "startQuizBtn",
      "nextQuestionBtn",
      "chatForm",
      "chatInput",
      "chatMessages",
      "chatStatus",
      "confidenceScore",
      "confidenceTopic",
      "quizScoreText",
      "quizScoreBar",
      "codeScoreText",
      "codeScoreBar",
      "recommendationText",
      "newsletterForm",
      "newsletterEmail",
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function loadCompleted() {
    try {
      return new Set(JSON.parse(window.localStorage.getItem(COMPLETED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function saveCompleted() {
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(state.completed)));
  }

  function loadScores() {
    try {
      return {
        quiz: 0,
        code: 0,
        ...JSON.parse(window.localStorage.getItem(SCORE_KEY) || "{}"),
      };
    } catch {
      return { quiz: 0, code: 0 };
    }
  }

  function saveScores() {
    window.localStorage.setItem(SCORE_KEY, JSON.stringify(state.scores));
  }

  function completionKey(language, topic) {
    return `${language}::${topic}`;
  }

  function getLessons(language = state.language) {
    return learningPaths[language] || learningPaths.Python;
  }

  function getCurrentLesson() {
    const lessons = getLessons();
    return lessons.find((lesson) => lesson.title === state.topic) || lessons[0];
  }

  function setCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((item) => {
      item.textContent = new Date().getFullYear();
    });
  }

  function setOutput(message, type = "") {
    elements.outputBox.textContent = message;
    elements.outputBox.classList.remove("success", "error");
    if (type) elements.outputBox.classList.add(type);
  }

  function updateLineNumbers() {
    const lines = Math.max(1, elements.codeEditor.value.split("\n").length);
    elements.lineNumbers.innerHTML = Array.from({ length: lines }, (_, index) => index + 1).join("<br>");
  }

  function closeDashboardNav() {
    elements.dashboardNavToggle?.setAttribute("aria-expanded", "false");
    elements.dashboardNavMenu?.classList.remove("is-open");
  }

  function toggleDashboardNav() {
    const isOpen = elements.dashboardNavToggle?.getAttribute("aria-expanded") === "true";
    elements.dashboardNavToggle?.setAttribute("aria-expanded", String(!isOpen));
    elements.dashboardNavMenu?.classList.toggle("is-open", !isOpen);
  }

  function updateActiveLanguageButtons() {
    document.querySelectorAll(".lang-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.language === state.language);
    });
  }

  function renderSkillList() {
    const lessons = getLessons();
    elements.skillList.textContent = "";

    lessons.forEach((lesson) => {
      const key = completionKey(state.language, lesson.title);
      const item = document.createElement("li");
      const isDone = state.completed.has(key);
      const isCurrent = lesson.title === state.topic;
      item.className = isDone ? "status-done" : isCurrent ? "status-current" : "status-pending";

      const topicButton = document.createElement("button");
      topicButton.type = "button";
      topicButton.className = "skill-topic-btn";
      topicButton.title = lesson.title;
      topicButton.addEventListener("click", () => selectLesson(lesson.title));
      topicButton.addEventListener("dblclick", () => markLessonDone(lesson.title));

      const dot = document.createElement("span");
      dot.className = "status-dot";
      dot.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = lesson.title;

      topicButton.append(dot, label);

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "skill-complete-btn";
      completeButton.title = `Mark ${lesson.title} complete`;
      completeButton.setAttribute("aria-label", `Mark ${lesson.title} complete`);
      completeButton.textContent = isDone ? "Done" : "Mark";
      completeButton.addEventListener("click", () => markLessonDone(lesson.title));

      item.append(topicButton, completeButton);
      elements.skillList.appendChild(item);
    });

    calculateProgress();
  }

  function renderLesson() {
    const lesson = getCurrentLesson();
    elements.lessonLanguage.textContent = state.language;
    elements.lessonTitle.textContent = `Lesson: ${lesson.title} in ${state.language}`;
    elements.lessonText.textContent = lesson.text;
    elements.lessonCode.textContent = lesson.code;
    elements.codeEditor.value = lesson.code;
    elements.confidenceTopic.textContent = lesson.title;
    updateLineNumbers();
    updateQuizIntro();
    updateRecommendation();
  }

  function changeLanguage(language) {
    if (!learningPaths[language]) return;

    state.language = language;
    state.topic = getLessons(language)[0].title;
    updateActiveLanguageButtons();
    renderSkillList();
    renderLesson();
    resetQuiz();
  }

  function selectLesson(topic) {
    state.topic = topic;
    renderSkillList();
    renderLesson();
    resetQuiz();
  }

  function markLessonDone(topic = state.topic) {
    state.completed.add(completionKey(state.language, topic));
    saveCompleted();
    renderSkillList();
    api.showToast(`${topic} marked complete.`, "success");
  }

  function calculateProgress() {
    const lessons = getLessons();
    const done = lessons.filter((lesson) =>
      state.completed.has(completionKey(state.language, lesson.title))
    ).length;
    const percentage = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

    elements.progressBar.style.width = `${percentage}%`;
    elements.progressText.textContent = `${percentage}%`;
  }

  function updateQuizIntro() {
    elements.quizTopicBadge.textContent = `Topic: ${state.topic}`;
  }

  function resetQuiz() {
    elements.quizIntro.hidden = false;
    elements.quizQuestions.hidden = true;
    elements.quizFeedback.textContent = "";
    elements.nextQuestionBtn.hidden = true;
    elements.quizOptions.textContent = "";
  }

  function startQuiz() {
    const lesson = getCurrentLesson();
    const quiz = lesson.quiz;

    elements.quizIntro.hidden = true;
    elements.quizQuestions.hidden = false;
    elements.nextQuestionBtn.hidden = true;
    elements.quizFeedback.textContent = "";
    elements.quizQuestionNumber.textContent = "Question 1 of 1";
    elements.quizTopicBadge.textContent = `Topic: ${lesson.title}`;
    elements.activeQuestionText.textContent = quiz.question;
    elements.quizOptions.textContent = "";

    quiz.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-btn";
      button.textContent = option;
      button.addEventListener("click", () => checkAnswer(button, index, quiz.correct));
      elements.quizOptions.appendChild(button);
    });

    elements.quizBox?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function checkAnswer(button, selectedIndex, correctIndex) {
    const buttons = elements.quizOptions.querySelectorAll(".option-btn");
    buttons.forEach((item) => {
      item.disabled = true;
    });

    if (selectedIndex === correctIndex) {
      button.classList.add("correct");
      elements.quizFeedback.textContent = "Correct. Confidence increased.";
      elements.quizFeedback.style.color = "var(--success)";
      updateScore("quiz", 10);
    } else {
      button.classList.add("wrong");
      buttons[correctIndex].classList.add("correct");
      elements.quizFeedback.textContent = "Not quite. Review the lesson and try the next topic.";
      elements.quizFeedback.style.color = "var(--danger)";
      updateScore("quiz", -5);
    }

    elements.nextQuestionBtn.hidden = false;
  }

  function updateScore(type, change) {
    state.scores[type] = Math.min(100, Math.max(0, Number(state.scores[type] || 0) + change));
    saveScores();
    updateConfidence();
  }

  function updateConfidence() {
    const quizScore = Number(state.scores.quiz || 0);
    const codeScore = Number(state.scores.code || 0);
    const confidence = Math.round((quizScore + codeScore) / 2);

    elements.confidenceScore.textContent = `${confidence}%`;
    elements.quizScoreText.textContent = `${quizScore}%`;
    elements.codeScoreText.textContent = `${codeScore}%`;
    elements.quizScoreBar.style.width = `${quizScore}%`;
    elements.codeScoreBar.style.width = `${codeScore}%`;
    updateRecommendation(confidence);
  }

  function updateRecommendation(confidence = null) {
    const score =
      confidence === null
        ? Math.round((Number(state.scores.quiz || 0) + Number(state.scores.code || 0)) / 2)
        : confidence;

    if (score < 30) {
      elements.recommendationText.textContent =
        "Run the sample code, read the output, then answer the quiz for this lesson.";
    } else if (score < 70) {
      elements.recommendationText.textContent =
        "Good momentum. Try changing the sample code and ask the AI tutor to explain the result.";
    } else {
      elements.recommendationText.textContent =
        "Strong progress. Mark this lesson complete and move to the next concept.";
    }
  }

  async function runCode() {
    api.setBusy(elements.runCodeBtn, true, "Running...");
    setOutput("Running code...", "");

    try {
      const { text } = await api.request("/run-code", {
        method: "POST",
        body: JSON.stringify({
          language: state.language,
          code: elements.codeEditor.value,
        }),
      });

      setOutput(text.trim() || "No output was produced by the program.", "success");
      updateScore("code", 8);
    } catch (error) {
      setOutput(error.message || "Code execution failed.", "error");
      updateScore("code", -4);
    } finally {
      api.setBusy(elements.runCodeBtn, false);
    }
  }

  async function explainCode() {
    api.setBusy(elements.explainCodeBtn, true, "Explaining...");
    setOutput("AI tutor is reading your code...", "");

    try {
      const { text } = await api.request("/explain", {
        method: "POST",
        body: JSON.stringify({
          language: state.language,
          code: elements.codeEditor.value,
        }),
        timeout: 30000,
      });

      setOutput(text.trim() || "The AI did not return an explanation. Please try again.", "success");
    } catch (error) {
      setOutput(error.message || "AI explanation failed.", "error");
    } finally {
      api.setBusy(elements.explainCodeBtn, false);
    }
  }

  async function fixCode() {
    api.setBusy(elements.fixCodeBtn, true, "Fixing...");
    setOutput("AI is fixing your code...", "");

    try {
      const { text } = await api.request("/fix", {
        method: "POST",
        body: JSON.stringify({
          language: state.language,
          code: elements.codeEditor.value,
        }),
        timeout: 30000,
      });

      elements.codeEditor.value = stripCodeFence(text || "");
      updateLineNumbers();
      setOutput("Code fixed successfully.", "success");
    } catch (error) {
      setOutput(error.message || "AI could not fix the code.", "error");
    } finally {
      api.setBusy(elements.fixCodeBtn, false);
    }
  }

  function stripCodeFence(value) {
    const text = String(value || "").trim();
    const match = text.match(/^```[a-zA-Z0-9+#.-]*\s*([\s\S]*?)\s*```$/);
    return match ? match[1].trim() : text;
  }

  function createMessage(role, text) {
    const message = document.createElement("div");
    message.className = role === "You" ? "message user-message" : "message ai-message";

    const strong = document.createElement("strong");
    strong.textContent = `${role}:`;

    const span = document.createElement("span");
    span.textContent = ` ${text}`;

    message.append(strong, span);
    return message;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const messageText = elements.chatInput.value.trim();
    if (!messageText) return;

    elements.chatMessages.appendChild(createMessage("You", messageText));
    elements.chatInput.value = "";
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    const loadingMessage = createMessage("AI", "Thinking...");
    elements.chatMessages.appendChild(loadingMessage);
    elements.chatStatus.textContent = "Thinking";

    try {
      const { text } = await api.request("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: messageText,
          language: state.language,
        }),
        timeout: 30000,
      });

      loadingMessage.replaceWith(createMessage("AI", text));
    } catch (error) {
      loadingMessage.replaceWith(
        createMessage("AI", error.message || "Could not connect to the AI tutor.")
      );
    } finally {
      elements.chatStatus.textContent = "Ready";
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
  }

  function downloadLessonPDF() {
    const lesson = getCurrentLesson();
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      api.showToast("Allow popups to print or save this lesson as PDF.", "warning");
      return;
    }

    printWindow.opener = null;
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(lesson.title)} - AI Learn</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #172033; line-height: 1.6; }
    pre { background: #f1f5f9; padding: 16px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${escapeHtml(lesson.title)} in ${escapeHtml(state.language)}</h1>
  <p>${escapeHtml(lesson.text)}</p>
  <pre>${escapeHtml(lesson.code)}</pre>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function handleNewsletter(event) {
    event.preventDefault();
    const email = elements.newsletterEmail.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      api.showToast("Enter a valid email address.", "warning");
      return;
    }

    const stored = JSON.parse(window.localStorage.getItem("aiLearnNewsletterEmails") || "[]");
    if (!stored.includes(email)) {
      stored.push(email);
      window.localStorage.setItem("aiLearnNewsletterEmails", JSON.stringify(stored));
    }

    elements.newsletterForm.reset();
    api.showToast("You are on the update list.", "success");
  }

  async function initializeProfile() {
    const storedUser = api.getCurrentUser();
    elements.profileName.textContent = storedUser || "Guest";

    if (!api.getToken()) return;

    try {
      const { text } = await api.request("/me");
      const data = JSON.parse(text);
      elements.profileName.textContent = data.username || storedUser || "Learner";
    } catch {
      elements.profileName.textContent = storedUser || "Guest";
    }
  }

  function logout() {
    api.clearSession();
    api.showToast("Logged out successfully.", "success");
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  }

  function bindEvents() {
    elements.dashboardNavToggle.addEventListener("click", toggleDashboardNav);

    document.querySelectorAll(".lang-btn").forEach((button) => {
      button.addEventListener("click", () => {
        changeLanguage(button.dataset.language);
        closeDashboardNav();
      });
    });

    document.querySelectorAll("[data-footer-language]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        changeLanguage(link.dataset.footerLanguage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    elements.logoutBtn.addEventListener("click", logout);
    elements.codeEditor.addEventListener("input", updateLineNumbers);
    elements.runCodeBtn.addEventListener("click", runCode);
    elements.explainCodeBtn.addEventListener("click", explainCode);
    elements.fixCodeBtn.addEventListener("click", fixCode);
    elements.downloadPdfBtn.addEventListener("click", downloadLessonPDF);
    elements.startQuizBtn.addEventListener("click", startQuiz);
    elements.nextQuestionBtn.addEventListener("click", () => {
      markLessonDone(state.topic);
      resetQuiz();
    });
    elements.chatForm.addEventListener("submit", sendMessage);
    elements.newsletterForm.addEventListener("submit", handleNewsletter);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDashboardNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeDashboardNav();
    });
  }

  function exposeCompatibilityGlobals() {
    window.changeLanguage = changeLanguage;
    window.logout = logout;
    window.runCode = runCode;
    window.explainCode = explainCode;
    window.fixCode = fixCode;
    window.downloadLessonPDF = downloadLessonPDF;
    window.startQuiz = startQuiz;
  }

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    setCurrentYear();
    bindEvents();
    exposeCompatibilityGlobals();
    initializeProfile();
    updateConfidence();
    changeLanguage("Python");
  });
})(window, document);
