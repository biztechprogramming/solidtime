import axios, { AxiosInstance } from 'axios';

export interface TimeEntry {
  id: string;
  description: string;
  start: string;
  end?: string;
  project_id?: string;
  client_id?: string;
  task_id?: string;
  tags?: string[];
  billable: boolean;
  user_id: string;
  member_id: string;
  organization_id: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  client_id?: string;
  billable?: boolean;
  billable_rate?: number;
  is_archived: boolean;
  is_public: boolean;
  estimated_time?: number;
  spent_time?: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  organization_id: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  name: string;
  project_id: string;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  currency: string;
  employees_can_see_billable_rates: boolean;
}

export class SolidtimeClient {
  private api: AxiosInstance;
  private organizationId: string;

  constructor(baseUrl: string, apiToken: string, organizationId: string) {
    this.organizationId = organizationId;
    this.api = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  // Time Entry Methods
  async createTimeEntry(data: {
    description?: string;
    start: string;
    end?: string;
    project_id?: string;
    task_id?: string;
    tags?: string[];
    billable?: boolean;
    member_id: string;
  }): Promise<TimeEntry> {
    try {
      console.error('Creating time entry with data:', JSON.stringify(data, null, 2));
      const response = await this.api.post(
        `/organizations/${this.organizationId}/time-entries`,
        data
      );
      return response.data.data;
    } catch (error: any) {
      console.error('API Error Response:', error.response?.data);
      throw error;
    }
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry> {
    const response = await this.api.put(
      `/organizations/${this.organizationId}/time-entries/${id}`,
      data
    );
    return response.data.data;
  }

  async getTimeEntries(params?: {
    member_id?: string;
    project_id?: string;
    client_id?: string;
    task_id?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: TimeEntry[]; meta: any }> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/time-entries`,
      { params }
    );
    return response.data;
  }

  async getTimeEntry(id: string): Promise<TimeEntry> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/time-entries/${id}`
    );
    return response.data.data;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.api.delete(
      `/organizations/${this.organizationId}/time-entries/${id}`
    );
  }

  async stopActiveTimeEntry(memberId: string): Promise<TimeEntry | null> {
    // First get active time entries for the member
    const activeEntries = await this.getTimeEntries({
      member_id: memberId,
      active: true
    });

    if (activeEntries.data.length > 0) {
      const activeEntry = activeEntries.data[0];
      // Stop the time entry by setting the end time
      return await this.updateTimeEntry(activeEntry.id, {
        end: new Date().toISOString()
      });
    }
    return null;
  }

  // Project Methods
  async getProjects(params?: {
    is_archived?: boolean;
  }): Promise<{ data: Project[]; meta: any }> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/projects`,
      { params }
    );
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/projects/${id}`
    );
    return response.data.data;
  }

  async createProject(data: {
    name: string;
    color: string;
    client_id?: string;
    billable?: boolean;
    billable_rate?: number;
    is_public?: boolean;
    estimated_time?: number;
  }): Promise<Project> {
    const response = await this.api.post(
      `/organizations/${this.organizationId}/projects`,
      data
    );
    return response.data.data;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const response = await this.api.put(
      `/organizations/${this.organizationId}/projects/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.api.delete(
      `/organizations/${this.organizationId}/projects/${id}`
    );
  }

  // Client Methods
  async getClients(params?: {
    is_archived?: boolean;
  }): Promise<{ data: Client[]; meta: any }> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/clients`,
      { params }
    );
    return response.data;
  }

  async getClient(id: string): Promise<Client> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/clients/${id}`
    );
    return response.data.data;
  }

  async createClient(data: {
    name: string;
  }): Promise<Client> {
    const response = await this.api.post(
      `/organizations/${this.organizationId}/clients`,
      data
    );
    return response.data.data;
  }

  async updateClient(id: string, data: {
    name?: string;
    is_archived?: boolean;
  }): Promise<Client> {
    const response = await this.api.put(
      `/organizations/${this.organizationId}/clients/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteClient(id: string): Promise<void> {
    await this.api.delete(
      `/organizations/${this.organizationId}/clients/${id}`
    );
  }

  // Task Methods
  async getTasks(projectId: string, params?: {
    is_done?: boolean;
  }): Promise<{ data: Task[]; meta: any }> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/projects/${projectId}/tasks`,
      { params }
    );
    return response.data;
  }

  async createTask(projectId: string, data: {
    name: string;
    is_done?: boolean;
  }): Promise<Task> {
    const response = await this.api.post(
      `/organizations/${this.organizationId}/projects/${projectId}/tasks`,
      data
    );
    return response.data.data;
  }

  async updateTask(projectId: string, taskId: string, data: {
    name?: string;
    is_done?: boolean;
  }): Promise<Task> {
    const response = await this.api.put(
      `/organizations/${this.organizationId}/projects/${projectId}/tasks/${taskId}`,
      data
    );
    return response.data.data;
  }

  // Organization Methods
  async getOrganization(): Promise<Organization> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}`
    );
    return response.data.data;
  }

  // Member Methods
  async getCurrentMember(): Promise<any> {
    const response = await this.api.get(
      `/organizations/${this.organizationId}/members/me`
    );
    return response.data.data;
  }
}