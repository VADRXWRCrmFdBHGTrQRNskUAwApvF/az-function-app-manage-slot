export abstract class Command<T> {
  protected abstract execute(): Promise<T>;

  async run(): Promise<T> {
    return this.execute();
  }
}
