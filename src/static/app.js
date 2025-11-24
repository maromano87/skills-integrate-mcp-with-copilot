document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Add filter controls
  const filterContainer = document.createElement("div");
  filterContainer.className = "form-group";
  filterContainer.innerHTML = `
    <label for="category-filter">Category:</label>
    <select id="category-filter">
      <option value="">All</option>
    </select>
    <label for="name-filter">Sort by name:</label>
    <select id="name-filter">
      <option value="asc">A-Z</option>
      <option value="desc">Z-A</option>
    </select>
    <label for="search-filter">Search:</label>
    <input type="text" id="search-filter" placeholder="Type to search..." />
    <button id="reset-filters" type="button" style="margin-left:10px;">Reset Filters</button>
  `;
  activitiesList.parentElement.insertBefore(filterContainer, activitiesList);

  const categoryFilter = document.getElementById("category-filter");
  const nameFilter = document.getElementById("name-filter");
  const searchFilter = document.getElementById("search-filter");
  const resetFiltersBtn = document.getElementById("reset-filters");
  // Reset filters functionality
  resetFiltersBtn.addEventListener("click", () => {
    categoryFilter.value = "";
    nameFilter.value = "asc";
    searchFilter.value = "";
    renderActivities();
  });

  let allActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Store all activities for filtering
      allActivities = activities;
      renderActivities();

      // Populate category filter
      const categories = new Set(Object.values(activities).map(a => a.category));
      categoryFilter.innerHTML = '<option value="">All</option>' + Array.from(categories).map(cat => `<option value="${cat}">${cat}</option>`).join("");

      // Populate activity select dropdown
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.keys(activities).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Filtering and rendering logic
  function renderActivities() {
    // Get filter values
    const selectedCategory = categoryFilter.value;
    const nameOrder = nameFilter.value;
    const searchText = searchFilter.value.trim().toLowerCase();

    // Filter and sort activities
    let filtered = Object.entries(allActivities);
    if (selectedCategory) {
      filtered = filtered.filter(([_, details]) => details.category === selectedCategory);
    }
    if (searchText) {
      filtered = filtered.filter(([name, details]) =>
        name.toLowerCase().includes(searchText) ||
        details.description.toLowerCase().includes(searchText) ||
        details.category.toLowerCase().includes(searchText)
      );
    }
    filtered = filtered.sort(([aName], [bName]) => {
      if (nameOrder === "asc") return aName.localeCompare(bName);
      else return bName.localeCompare(aName);
    });

    // Clear activities list
    activitiesList.innerHTML = "";

    // Render filtered activities
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;
      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p><strong>Category:</strong> ${details.category}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;
      activitiesList.appendChild(activityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Add filter event listeners
  categoryFilter.addEventListener("change", renderActivities);
  nameFilter.addEventListener("change", renderActivities);
  searchFilter.addEventListener("input", renderActivities);

  // Initialize app
  fetchActivities();
});
