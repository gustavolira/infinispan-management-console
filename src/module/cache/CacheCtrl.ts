import {openConfirmationModal} from "../../common/dialogs/Modals";
import {IIntervalService} from "angular";
import {IStateService} from "angular-ui-router";
import {CacheService} from "../../services/cache/CacheService";
import {ICacheContainer} from "../../services/container/ICacheContainer";
import {ICache} from "../../services/cache/ICache";
import IModalServiceInstance = angular.ui.bootstrap.IModalServiceInstance;
import IModalService = angular.ui.bootstrap.IModalService;
import {LaunchTypeService} from "../../services/launchtype/LaunchTypeService";
import {isNullOrUndefined, convertBytes, convertTime} from "../../common/utils/Utils";

export class CacheCtrl {
  static $inject: string[] = ["$state", "$interval", "$uibModal", "cacheService", "launchType",
    "container", "cache", "stats", "availability", "cacheEnabledRSP"];

  private cacheEnabled: boolean;
  private errorExecuting: boolean;
  private successExecuteOperation: boolean;
  private errorDescription: string;

  constructor(private $state: IStateService, private $interval: IIntervalService,
              private $uibModal: IModalService, private cacheService: CacheService,
              private launchType: LaunchTypeService, private container: ICacheContainer,
              private cache: ICache, private stats: any, private availability: string,
              private cacheEnabledRSP: any) {
    this.cacheEnabled = !cacheEnabledRSP[cache.name];
  }

  createEnableModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Enabling cache " + this.cache.name + " will attach it to all active remote endpoints. Enable?");
    modal.result.then(() => {
      this.cacheService.enable(this.container.profile, this.cache)
        .then(() => {
          this.cacheEnabled = true;
          this.successExecuteOperation = true;
        })
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createDisableModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Disabling cache " + this.cache.name + " will detach it from all active remote endpoints. Disable?");
    modal.result.then(() => {
      this.cacheService.disable(this.container.profile, this.cache)
        .then(() => {
          this.cacheEnabled = false;
          this.successExecuteOperation = true;
        })
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createFlushModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Flushing cache " + this.cache.name + " will passivate all its cache entries. Flush?");
    modal.result.then(() => {
      this.cacheService.flushCache(this.container, this.cache)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createReindexModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Re-indexing cache " + this.cache.name + " will remove its current index and recreate it according to the cache contents' schema. Re-index?");
    modal.result.then(() => {
      this.cacheService.indexCache(this.container, this.cache)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createClearModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Clearing cache " + this.cache.name + " will remove all of its cache entries both from memory and from any associated persistent stores. Clear?");
    modal.result.then(() => {
      this.cacheService.clearCache(this.container, this.cache)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createDeleteModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Deleting cache " + this.cache.name + " will remove the cache itself along with all its contents. Delete?");
    modal.result.then(() => {
      this.cacheService.deleteCache(this.container, this.cache)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.$state.go("container.caches", {
            profileName: this.container.profile,
            containerName: this.container.name
          }, {
            reload: true
          });
        });
    });
  }

  createEnableRebalancingModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Enabling rebalancing of " + this.cache.name + " will automatically redistribute data across the cluster when nodes are added/removed. Enable rebalancing?");
    modal.result.then(() => {
      this.cacheService.setRebalance(this.container, this.cache, true)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  createDisableRebalancingModal(): void {
    this.clearOpsFeedback();
    let modal: IModalServiceInstance = openConfirmationModal(this.$uibModal,
      "Disabling rebalancing of " + this.cache.name + " will NOT automatically redistribute data across the cluster when nodes are added/removed. Disable rebalancing?");
    modal.result.then(() => {
      this.cacheService.setRebalance(this.container, this.cache, false)
        .then(() => this.successExecuteOperation = true)
        .catch((e: any) => {
          this.errorExecuting = true;
          this.errorDescription = e.toString();
        })
        .finally(() => {
          this.refresh();
        });
    });
  }

  isCurrentCacheAvailable(): boolean {
    return this.availability === "AVAILABLE";
  }

  isLocalMode(): boolean {
    return this.launchType.isStandaloneLocalMode();
  }

  resetStats(): void {
    this.cacheService.resetStats(this.container, this.cache).finally(() => {
      this.refresh();
    });
  }

  clusterSize(): number {
    if (this.isLocalMode() || isNullOrUndefined(this.container.serverGroup)) {
      return 1;
    } else {
      return this.container.serverGroup.members.length;
    }
  }

  calculateMaxOffHeap(cache: ICache): number {
    let size: number = cache.offHeapSize();
    return size > -1 ? size * this.clusterSize() : -1;
  }

  hasMaxOffHeapValue(cache: ICache): boolean {
    return this.calculateMaxOffHeap(cache) > 0;
  }

  convertTime(nanos: number): string {
    return convertTime(nanos);
  }

  convertBytes(bytes: number): string {
    return convertBytes(bytes);
  }

  private refresh(): void {
    this.cacheService.getCacheStats(this.container, this.cache).then((result) => {
      this.stats = result;
    });
    this.cacheService.isEnabled(this.container.profile, this.cache).then((cacheEnabledRSP) => {
      this.cacheEnabled = !cacheEnabledRSP[this.cache.name];
    });
  }

  private clearOpsFeedback(): void {
    this.successExecuteOperation = false;
    this.errorExecuting = false;
    this.errorDescription = "";
  }
}
