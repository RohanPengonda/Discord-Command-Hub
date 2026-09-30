export interface CommandOptionDefinition {
  name: string;
  description: string;
  type: number;
  required?: boolean;
}

export interface CommandDefinition {
  name: string;
  description: string;
  options?: CommandOptionDefinition[];
}

/**
 * Canonical list of application commands.
 * Single source of truth used by:
 *  - DiscordApiService.registerGlobalCommands() (Discord REST registration)
 *  - ConfigRepository.ensureConfigsForServer()  (command_configurations rows)
 */
export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: 'report',
    description: 'Submit an issue or report for AI analysis and team notification',
    options: [
      {
        name: 'issue',
        description: 'Description of the problem or report',
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: 'status',
    description: 'Check system, database, and bot health status',
  },
];

export const COMMAND_NAMES: string[] = COMMAND_DEFINITIONS.map((c) => c.name);

/**
 * Applied when a command_configurations row is first created.
 * Never used to overwrite an existing row, so admin toggles survive re-provisioning.
 */
export const DEFAULT_COMMAND_SETTINGS = {
  enabled: true,
  saveLogs: true,
  replyInDiscord: true,
  mirrorNotification: true,
  aiProcessing: true,
};

export function hasCommand(name: string | null | undefined): boolean {
  return !!name && COMMAND_NAMES.includes(name);
}