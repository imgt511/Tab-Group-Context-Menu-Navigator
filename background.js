// background.js

// A unique ID for the parent context menu item.
const PARENT_MENU_ID = "navigateToTabGroupParent";

// A prefix for child menu item IDs to distinguish them from other menu items.
const CHILD_MENU_ID_PREFIX = "tab_group_nav_";

/**
 * Rebuilds the context menu to reflect the current state of tab groups.
 * This function first removes the old menu and then creates a new one
 * based on the currently open tab groups.
 */
async function rebuildContextMenu() {
  // Remove all existing context menus created by this extension to ensure a clean slate.
  await chrome.contextMenus.removeAll();

  // Query for all currently existing tab groups across all windows.
  const tabGroups = await chrome.tabGroups.query({});

  // Create the main parent context menu item.
  chrome.contextMenus.create({
    id: PARENT_MENU_ID,
    title: "Navigate to Tab Group",
    contexts: ["all"],
  });

  // If there are no active tab groups, add a disabled placeholder item.
  if (tabGroups.length === 0) {
    chrome.contextMenus.create({
      id: "noGroupsPlaceholder",
      parentId: PARENT_MENU_ID,
      title: "No active tab groups",
      enabled: false,
      contexts: ["all"],
    });
    return; // Stop execution as there are no groups to list.
  }

  // Iterate over each found tab group and create a child menu item for it.
  for (const group of tabGroups) {
    chrome.contextMenus.create({
      id: `${CHILD_MENU_ID_PREFIX}${group.id}`,
      parentId: PARENT_MENU_ID,
      // Use the group title, or a placeholder if the title is empty.
      title: group.title || "Untitled Group",
      contexts: ["all"],
    });
  }
}

// Add a listener for the initial extension installation.
chrome.runtime.onInstalled.addListener(() => {
  rebuildContextMenu();
});

// Add listeners for tab group events to keep the context menu up-to-date.
chrome.tabGroups.onCreated.addListener(rebuildContextMenu);
chrome.tabGroups.onUpdated.addListener(rebuildContextMenu);
chrome.tabGroups.onRemoved.addListener(rebuildContextMenu);

// Add a listener for when a context menu item is clicked.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuItemId = String(info.menuItemId);

  // Check if the clicked item is one of our tab group navigation items.
  if (menuItemId.startsWith(CHILD_MENU_ID_PREFIX)) {
    // Extract the group ID from the menu item's ID.
    const groupId = parseInt(menuItemId.replace(CHILD_MENU_ID_PREFIX, ""), 10);

    // Find all tabs that belong to the selected group.
    const tabsInGroup = await chrome.tabs.query({ groupId: groupId });

    if (tabsInGroup.length > 0) {
      // Get the first tab in the group.
      const targetTab = tabsInGroup[0];

      // Bring the window containing the tab to the front.
      await chrome.windows.update(targetTab.windowId, { focused: true });

      // Activate the tab within its window.
      await chrome.tabs.update(targetTab.id, { active: true });
    }
  }
});