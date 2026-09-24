/** API base URL — empty uses Vite proxy (/api → backend). */
export const environment = {
  baseurl: (import.meta.env.VITE_API_URL as string | undefined) ?? "",
  appname: "Krios Salon",
};
