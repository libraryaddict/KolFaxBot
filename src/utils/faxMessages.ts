export enum FaxMessages {
  // The only message that's not an error
  FAX_READY = `Your fax is ready: {monster}`,
  // Error messages for invalid monsters
  ERROR_MONSTER_UNKNOWN = `Error! I do not recognize that monster, try sending the monster ID`,
  ERROR_MULTIPLE_MONSTER_MATCHES_NOT_IN_NETWORK = `Error! Multiple monsters matched that name but none of them are in my fax network`,
  ERROR_MULTIPLE_MONSTER_MATCHES = `Error! Multiple monsters in my fax network matched that name, clarify the monster name or use the monster ID`,
  ERROR_MONSTER_NOT_IN_FAX_NETWORK = `Error! {monster} is not in my fax network`,
  ERROR_MONSTER_REMOVED_FAX_NETWORK = `Error! {monster} appears to have been removed from the fax network`,
  // Errors for problems with the user
  ERROR_NOT_WHITELISTED_YOUR_CLAN = `Error! I am not whitelisted to your clan {clan}`,
  ERROR_CANNOT_FIND_YOUR_CLAN = `Error! I cannot identify which clan you are in`,
  ERROR_NO_FAX_MACHINE = `Error! Your clan {clan} does not have a fax machine`,
  // Errors for problems with hopping clans
  ERROR_UNKNOWN_FAX_MACHINE_STATE = `Error! Encountered unknown problem while attempting to grab the fax from the source clan`,
  ERROR_TRAPPED_IN_CLAN = `Error! I am trapped in a clan, please contact my bot operator {operator}`,
  ERROR_UNABLE_JOIN_SOURCE_CLAN = `Error! I am unable to join the fax source clan, please contact my bot operator {operator} if this continues to happen`,
  ERROR_JOINING_YOUR_CLAN = `Error! Unknown issue while trying to join your clan, if this persists please contact {operator}`,
  // Errors when the bot refuses to do something bad
  ERROR_ILLEGAL_CLAN = `Error! Your clan is a fax source clan and I cannot dump a fax here`,
  ERROR_TOO_CLOSE_ROLLOVER = `Error! Rollover is near and I am sincere in my fear I must declare that I cannot share a fax for fear I will be in arrears when rollover interferes`,
  ERROR_FAILED_DUMP_FAX = `Error! Failed to dump a fax in a sideclan, please report this to my bot operator if this continues to happen`,
  // Errors when the bot suffers an internal problem
  ERROR_INTERNAL_ERROR = `Error! The bot suffered an internal issue, if this persists please contact the bot operator {operator}`,
  ERROR_UNKNOWN_CLAN = `Error! I failed to load information for my current clan properly`,
}
