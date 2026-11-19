import { mount } from "../components/AppShell";
import { ProfilePage } from "../pages/ProfilePage";
import { bluesky } from "../platforms/bluesky";

mount(<ProfilePage platform={bluesky} />);
