// frontend/src/utils/toast.js

let toastTimeout = null;

export function showToast(message, type = "success") {
    // remove existing toast if any
    const existing = document.getElementById("global-toast");
    if (existing) {
        existing.remove();
    }

    // create toast element
    const toast = document.createElement("div");
    toast.id = "global-toast";
    toast.className = `toast toast-${type}`;
    toast.innerText = message;

    document.body.appendChild(toast);

    // trigger animation
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    // auto remove
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}