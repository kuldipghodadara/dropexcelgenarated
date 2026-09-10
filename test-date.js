const d = new Date("2026-11-20");
d.setUTCHours(23, 59, 59, 999);
console.log("Success:", d.toISOString());
