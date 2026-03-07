import type { Project } from "@/types";
import mockYaml from "./mock.yaml";

export const mockProjects: Project[] = (mockYaml as { projects: Project[] }).projects;
