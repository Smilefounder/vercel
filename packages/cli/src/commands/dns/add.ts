import chalk from 'chalk';
import {
  DomainNotFound,
  DNSPermissionDenied,
  DNSInvalidPort,
  DNSInvalidType,
} from '../../util/errors-ts';
import addDNSRecord from '../../util/dns/add-dns-record';
import Client from '../../util/client';
import getScope from '../../util/get-scope';
import parseAddDNSRecordArgs from '../../util/dns/parse-add-dns-record-args';
import stamp from '../../util/output/stamp';
import getDNSData from '../../util/dns/get-dns-data';
import { getCommandName } from '../../util/pkg-name';

type Options = {};

export default async function add(
  client: Client,
  opts: Options,
  args: string[]
) {
  const { output } = client;
  const { contextName } = await getScope(client);

  const parsedParams = parseAddDNSRecordArgs(args);
  if (!parsedParams) {
    output.error(
      `Invalid number of arguments. See: ${chalk.cyan(
        `${getCommandName('dns --help')}`
      )} for usage.`
    );
    return 1;
  }

  const addStamp = stamp();
  const { domain, data: argData } = parsedParams;
  const data = await getDNSData(client, argData);
  if (!data) {
    output.log(`Aborted`);
    return 1;
  }

  const record = await addDNSRecord(client, domain, data);
  if (record instanceof DomainNotFound) {
    output.error(
      `The domain ${domain} can't be found under ${chalk.bold(
        contextName
      )} ${chalk.gray(addStamp())}`
    );
    return 1;
  }

  if (record instanceof DNSPermissionDenied) {
    output.error(
      `You don't have permissions to add records to domain ${domain} under ${chalk.bold(
        contextName
      )} ${chalk.gray(addStamp())}`
    );
    return 1;
  }

  if (record instanceof DNSInvalidPort) {
    output.error(
      `Invalid <port> parameter. A number was expected ${chalk.gray(
        addStamp()
      )}`
    );
    return 1;
  }

  if (record instanceof DNSInvalidType) {
    output.error(
      `Invalid <type> parameter "${
        record.meta.type
      }". Expected one of A, AAAA, ALIAS, CAA, CNAME, MX, SRV, TXT ${chalk.gray(
        addStamp()
      )}`
    );
    return 1;
  }

  if (record instanceof Error) {
    output.error(record.message);
    return 1;
  }

  console.log(
    `${chalk.cyan('> Success!')} DNS record for domain ${chalk.bold(
      domain
    )} ${chalk.gray(`(${record.uid})`)} created under ${chalk.bold(
      contextName
    )} ${chalk.gray(addStamp())}`
  );

  return 0;
}
