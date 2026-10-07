/** Footage and stills shipped in public/media, offered as quick picks in the editor. */
const CLIPS = [
  { name: "hero-ship-containers", label: "Container ship at port" },
  { name: "port-terminal", label: "Port terminal cranes" },
  { name: "ship-ocean", label: "Bulk carrier at sea" },
  { name: "greenhouse-tomatoes", label: "Greenhouse tomatoes" },
  { name: "fields-aerial", label: "Fields from the air" },
  { name: "fields-sunrise", label: "Farmland at sunrise" },
];

export const BUILT_IN_IMAGES = CLIPS.map((clip) => ({ url: `/media/${clip.name}.jpg`, label: clip.label }));
export const BUILT_IN_VIDEOS = CLIPS.map((clip) => ({ url: `/media/${clip.name}.mp4`, poster: `/media/${clip.name}.jpg`, label: clip.label }));

export const LINK_SUGGESTIONS = [
  { value: "/", label: "Home" },
  { value: "/platform", label: "Platform" },
  { value: "/why-aquifert", label: "Why Aquifert" },
  { value: "/membership", label: "Membership" },
  { value: "/membership#plans", label: "Membership plans" },
  { value: "/contact", label: "Contact" },
  { value: "/help", label: "Help" },
  { value: "/login", label: "Log in" },
  { value: "/register", label: "Create an account" },
  { value: "/legal", label: "Legal" },
  { value: "mailto:enquiry@aquifert.com", label: "Email the desk" },
];
