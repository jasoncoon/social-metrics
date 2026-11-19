import { mount } from "../components/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { mastodon } from "../platforms/mastodon";

mount(<DashboardPage platform={mastodon} />);
