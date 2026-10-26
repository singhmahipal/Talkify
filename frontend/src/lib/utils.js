export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const getAvatarUrl = (profilePic, name = "User") => {
  if (!profilePic || profilePic.includes("avatar.iran.liara.run")) {
    const match = profilePic?.match(/\/(\d+)\.png/);
    const seed = match ? match[1] : encodeURIComponent(name || "User");
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }
  return profilePic;
};

export const handleImageError = (e, fallbackName = "User") => {
  e.currentTarget.onerror = null; // Prevent infinite loop
  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || "User")}&background=random`;
};
