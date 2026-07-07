const BASE = 'https://www.themealdb.com/api/json/v1/1';
let searchType = 'name';
let favourites = JSON.parse(localStorage.getItem('recipe-favs') || '[]');
let currentCategory = '';

// ===== SEARCH =====
function setSearchType(type, btn) {
  searchType = type;
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('searchInput').placeholder =
    type === 'name' ? 'Search recipes e.g. Chicken, Pasta...' : 'Search by ingredient e.g. tomato, garlic...';
}

async function searchRecipes() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) { alert('Enter a search term!'); return; }

  currentCategory = '';
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));

  const grid = document.getElementById('recipesGrid');
  showLoading(grid);
  showResults(`Results for "${query}"`);

  try {
    const url = searchType === 'name'
      ? `${BASE}/search.php?s=${encodeURIComponent(query)}`
      : `${BASE}/filter.php?i=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    const data = await res.json();
    const meals = data.meals || [];

    if (meals.length === 0) {
      grid.innerHTML = '<div class="empty-grid">No recipes found. Try a different search!</div>';
      document.getElementById('resultsCount').textContent = '0 results';
      return;
    }

    document.getElementById('resultsCount').textContent = `${meals.length} results`;
    renderRecipeCards(grid, meals);
  } catch(e) {
    grid.innerHTML = '<div class="empty-grid">Failed to fetch recipes. Check connection!</div>';
  }
}

async function searchByCategory(category, btn) {
  currentCategory = category;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('searchInput').value = '';

  const grid = document.getElementById('recipesGrid');
  showLoading(grid);
  showResults(category + ' Recipes');

  try {
    const res = await fetch(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
    const data = await res.json();
    const meals = data.meals || [];
    document.getElementById('resultsCount').textContent = `${meals.length} results`;
    renderRecipeCards(grid, meals);
  } catch(e) {
    grid.innerHTML = '<div class="empty-grid">Failed to fetch recipes!</div>';
  }
}

async function getRandomRecipe() {
  try {
    const res = await fetch(`${BASE}/random.php`);
    const data = await res.json();
    if (data.meals) openRecipeModal(data.meals[0]);
  } catch(e) {
    alert('Failed to get random recipe!');
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${BASE}/categories.php`);
    const data = await res.json();
    const wrap = document.getElementById('categoriesWrap');
    wrap.innerHTML = data.categories.map(c => `
      <div class="cat-pill" onclick="searchByCategory('${c.strCategory}', this)">
        <img src="${c.strCategoryThumb}" alt="${c.strCategory}"/>
        ${c.strCategory}
      </div>`).join('');
  } catch(e) {
    console.error('Failed to load categories');
  }
}

// ===== RECIPE CARDS =====
function renderRecipeCards(container, meals) {
  container.innerHTML = meals.map(m => {
    const isFav = favourites.some(f => f.idMeal === m.idMeal);
    return `
      <div class="recipe-card">
        ${m.strMealThumb
          ? `<img class="recipe-thumb" src="${m.strMealThumb}/preview"
                  alt="${m.strMeal}" loading="lazy"/>`
          : `<div class="recipe-thumb-placeholder">🍽️</div>`}
        <div class="recipe-body">
          <div class="recipe-name">${m.strMeal}</div>
          <div class="recipe-meta">
            ${m.strCategory ? `<span class="recipe-tag">${m.strCategory}</span>` : ''}
            ${m.strArea ? `<span class="recipe-tag">${m.strArea}</span>` : ''}
          </div>
          <div class="recipe-actions">
            <button class="btn-view" onclick="fetchAndOpen('${m.idMeal}')">
              👁 View Recipe
            </button>
            <button class="btn-fav ${isFav ? 'faved' : ''}"
                    onclick="toggleFav('${m.idMeal}', '${m.strMeal}', '${m.strMealThumb}', this)">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ===== MODAL =====
async function fetchAndOpen(id) {
  try {
    const res = await fetch(`${BASE}/lookup.php?i=${id}`);
    const data = await res.json();
    if (data.meals) openRecipeModal(data.meals[0]);
  } catch(e) {
    alert('Failed to load recipe!');
  }
}

function openRecipeModal(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({ ing: ing.trim(), measure: (measure || '').trim() });
    }
  }

  const isFav = favourites.some(f => f.idMeal === meal.idMeal);

  document.getElementById('modalContent').innerHTML = `
    <img class="modal-img" src="${meal.strMealThumb || ''}"
         alt="${meal.strMeal}" onerror="this.style.display='none'"/>
    <div class="modal-body">
      <div class="modal-title">${meal.strMeal}</div>
      <div class="modal-tags">
        ${meal.strCategory ? `<span class="modal-tag">🍽️ ${meal.strCategory}</span>` : ''}
        ${meal.strArea ? `<span class="modal-tag">🌍 ${meal.strArea}</span>` : ''}
        ${meal.strTags ? meal.strTags.split(',').map(t =>
          `<span class="modal-tag">#${t.trim()}</span>`).join('') : ''}
      </div>

      <div class="modal-section">
        <h4>Ingredients (${ingredients.length})</h4>
        <div class="ingredients-grid">
          ${ingredients.map(i => `
            <div class="ingredient-item">
              <span class="ingredient-measure">${i.measure}</span>
              <span>${i.ing}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h4>Instructions</h4>
        <div class="instructions">${meal.strInstructions || 'No instructions available.'}</div>
      </div>

      <div class="modal-actions">
        ${meal.strYoutube ? `
          <a class="btn-youtube" href="${meal.strYoutube}"
             target="_blank">▶ Watch on YouTube</a>` : ''}
        <button class="btn-fav ${isFav ? 'faved' : ''}"
                onclick="toggleFav('${meal.idMeal}', '${meal.strMeal}', '${meal.strMealThumb}', this)">
          ${isFav ? '❤️ Saved' : '🤍 Save Recipe'}
        </button>
      </div>
    </div>`;

  document.getElementById('recipeModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('recipeModal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== FAVOURITES =====
function toggleFav(id, name, thumb, btn) {
  const idx = favourites.findIndex(f => f.idMeal === id);
  if (idx === -1) {
    favourites.push({ idMeal: id, strMeal: name, strMealThumb: thumb });
    btn.textContent = '❤️';
    btn.classList.add('faved');
  } else {
    favourites.splice(idx, 1);
    btn.textContent = '🤍';
    btn.classList.remove('faved');
  }
  localStorage.setItem('recipe-favs', JSON.stringify(favourites));
  renderFavourites();
}

function renderFavourites() {
  const grid = document.getElementById('favsGrid');
  const section = document.getElementById('favsSection');

  if (favourites.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'flex';
  grid.innerHTML = favourites.map(m => `
    <div class="recipe-card">
      ${m.strMealThumb
        ? `<img class="recipe-thumb" src="${m.strMealThumb}/preview" alt="${m.strMeal}"/>`
        : `<div class="recipe-thumb-placeholder">🍽️</div>`}
      <div class="recipe-body">
        <div class="recipe-name">${m.strMeal}</div>
        <div class="recipe-actions">
          <button class="btn-view" onclick="fetchAndOpen('${m.idMeal}')">
            👁 View Recipe
          </button>
          <button class="btn-fav faved"
                  onclick="toggleFav('${m.idMeal}','${m.strMeal}','${m.strMealThumb}',this)">
            ❤️
          </button>
        </div>
      </div>
    </div>`).join('');
}

function clearFavs() {
  if (!confirm('Clear all saved recipes?')) return;
  favourites = [];
  localStorage.removeItem('recipe-favs');
  renderFavourites();
}

function showLoading(grid) {
  grid.innerHTML = `<div class="loading-state">
    <div class="spinner"></div>
    <p>Fetching recipes...</p>
  </div>`;
}

function showResults(title) {
  document.getElementById('resultsSection').style.display = 'flex';
  document.getElementById('resultsTitle').textContent = title;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

window.onload = () => {
  loadCategories();
  renderFavourites();
};