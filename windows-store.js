(function () {
  var option = document.getElementById("windows-store-option");
  if (!option || option.getAttribute("data-approved") !== "true") return;

  var productId = (option.getAttribute("data-product-id") || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(productId)) return;

  var link = option.querySelector("a");
  if (!link) return;
  link.setAttribute("href", "https://apps.microsoft.com/detail/" + productId);
  option.hidden = false;
})();
