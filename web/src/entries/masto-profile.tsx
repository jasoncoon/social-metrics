import { mount } from "../components/AppShell";
import { ProfilePage } from "../pages/ProfilePage";
import { mastodon } from "../platforms/mastodon";

mount(<ProfilePage platform={mastodon} />);
