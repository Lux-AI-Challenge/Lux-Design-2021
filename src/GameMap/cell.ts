import { Resource } from '../Resource';
import { Unit } from '../Unit';
import { CityTile } from '../Game/city';
import { LuxMatchConfigs } from '../types';

/**
 * Cell class for map cells
 *
 * Some restrictions not explicitly employed:
 * Cell can either be empty (no resource or citytile), or have a resource, or have a citytile, not multiple.
 * There may be multiple units but this is only allowed on city tiles
 */
export class Cell {
  public resource: Resource;
  public citytile: CityTile;
  /** map from unit id to the unit on this tile */
  public units: Map<string, Unit> = new Map();
  constructor(
    public x: number,
    public y: number,
    public configs: Readonly<LuxMatchConfigs>
  ) {}

  /**
   * Set resource at cell and the amount of it
   * @param resourceType
   * @param amount
   */
  setResource(resourceType: Resource.Types, amount: number): Resource {
    this.resource = new Resource(resourceType, amount);
    return this.resource;
  }
  hasResource(): boolean {
    return this.resource !== undefined;
  }

  /** Marks this as a city tile with the specified team */
  setCityTile(team: Unit.TEAM, cityid: string): void {
    this.citytile = new CityTile(team, this.configs);
    this.citytile.cityid = cityid;
  }

  isCityTile(): boolean {
    return this.citytile !== undefined;
  }

  hasUnits(): boolean {
    return this.units.size !== 0;
  }
}
export namespace Cell {}
