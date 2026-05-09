import type { Route } from '@/root/_routes';

function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function escapeAttr(value: unknown): string {
	return escapeHtml(value);
}

export function rootPage(routes: Route[]): Response {
	const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Region API</title>

<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>

<style>
body {
  background-color: #000;
  background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 22px 22px;
}
</style>
</head>

<body class="min-h-screen flex items-center justify-center text-neutral-200 font-mono px-4">

<div class="w-full max-w-xl">

  <div class="mb-6">
    <h1 class="text-xl tracking-wide text-neutral-300 pb-2">Region API</h1>

    <p class="text-xs text-neutral-500 mt-1 leading-relaxed">
      This API helps you get the region of a user and is designed specifically for the
      <a
        href="https://www.npmjs.com/package/next-analytics-installer"
        target="_blank"
        rel="noreferrer"
        class="text-neutral-300 underline underline-offset-4 hover:text-white"
      >
        next-analytics-installer
      </a>
      npm package.
    </p>

    <p class="text-xs text-neutral-500/80 mt-4">Click a route to open it. Click the copy icon to copy endpoint.</p>
  </div>

  <div class="mb-4 relative">
    <input
      id="search"
      placeholder="Search routes..."
      class="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 pr-9 text-sm outline-none focus:border-neutral-600 placeholder:text-neutral-500"
    />
    <i data-lucide="search" class="w-4 h-4 absolute right-3 top-2.5 text-neutral-500"></i>
  </div>

  <div id="routes" class="space-y-2 text-sm">
    ${
			routes.length > 0
				? routes
						.map((route) => {
							const method = escapeAttr(route.method);
							const path = escapeAttr(route.path);
							const description = escapeAttr(route.description ?? '');

							return `
      <button
        type="button"
        data-method="${method.toLowerCase()}"
        data-path="${path.toLowerCase()}"
        data-description="${description.toLowerCase()}"
        data-route-path="${path}"
        class="route w-full flex items-center justify-between border border-neutral-800 px-3 py-2 hover:border-neutral-600 hover:bg-neutral-900 transition cursor-pointer active:scale-[0.98] text-left"
      >
        <div class="flex gap-3 items-center min-w-0">
          <span class="text-xs text-neutral-500 w-14 shrink-0">${method}</span>

          <div class="flex flex-col min-w-0">
            <span class="text-neutral-300/80 truncate">${path}</span>
            <span class="text-neutral-300 pt-1 truncate">${description}</span>
          </div>
        </div>

        <span
          role="button"
          tabindex="0"
          aria-label="Copy ${path}"
          data-copy-path="${path}"
          class="copy-btn shrink-0 ml-3 p-1 hover:text-white"
        >
          <i data-lucide="copy" class="w-4 h-4 text-neutral-500"></i>
        </span>
      </button>
    `;
						})
						.join('')
				: `
      <div class="border border-neutral-800 px-3 py-4 text-sm text-neutral-500">
        No routes registered.
      </div>
    `
		}
  </div>

</div>

<script>
function getFullUrl(path) {
  return window.location.origin + path;
}

function showToast(message) {
  const existing = document.querySelector("[data-toast]");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.dataset.toast = "true";
  el.innerText = message;
  el.className = "fixed bottom-6 right-6 text-xs bg-neutral-800 px-3 py-2 border border-neutral-600 text-neutral-200";
  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1200);
}

async function copyRoute(path) {
  const full = getFullUrl(path);

  try {
    await navigator.clipboard.writeText(full);
    showToast("Copied " + full);
  } catch {
    showToast("Copy failed");
  }
}

function openRoute(path) {
  window.open(path, "_blank", "noopener,noreferrer");
}

document.querySelectorAll(".route").forEach((el) => {
  el.addEventListener("click", () => {
    openRoute(el.dataset.routePath);
  });
});

document.querySelectorAll(".copy-btn").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    copyRoute(el.dataset.copyPath);
  });

  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      copyRoute(el.dataset.copyPath);
    }
  });
});

const search = document.getElementById("search");
const routesEls = document.querySelectorAll(".route");

search.addEventListener("input", () => {
  const q = search.value.toLowerCase().trim();

  routesEls.forEach((el) => {
    const method = el.dataset.method ?? "";
    const path = el.dataset.path ?? "";
    const description = el.dataset.description ?? "";

    const matches =
      method.includes(q) ||
      path.includes(q) ||
      description.includes(q);

    el.style.display = matches ? "flex" : "none";
  });
});

lucide.createIcons();
</script>

</body>
</html>
  `;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html;charset=UTF-8',
		},
	});
}
