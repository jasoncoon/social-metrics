import { mount } from "../components/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { bluesky } from "../platforms/bluesky";

mount(<DashboardPage platform={bluesky} />);
