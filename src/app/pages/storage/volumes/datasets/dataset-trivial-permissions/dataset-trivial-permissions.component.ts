import { Component } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog/dialog-ref';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as _ from 'lodash';
import { AclType } from 'app/enums/acl-type.enum';
import helptext from 'app/helptext/storage/volumes/datasets/dataset-permissions';
import { FormConfiguration } from 'app/interfaces/entity-form.interface';
import { Option } from 'app/interfaces/option.interface';
import { EntityFormComponent } from 'app/pages/common/entity/entity-form';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { FieldSet } from 'app/pages/common/entity/entity-form/models/fieldset.interface';
import { EntityJobComponent } from 'app/pages/common/entity/entity-job/entity-job.component';
import {
  DialogService, StorageService, UserService, WebSocketService,
} from 'app/services';
import { T } from 'app/translate-marker';
import { filter } from 'rxjs/operators';

@UntilDestroy()
@Component({
  selector: 'app-dataset-permissions',
  templateUrl: './dataset-trivial-permissions.component.html',
  styleUrls: ['./dataset-trivial-permissions.component.scss'],
})
export class DatasetTrivialPermissionsComponent implements FormConfiguration {
  protected updateCall: 'pool.dataset.permission' = 'pool.dataset.permission';

  datasetPath: string;

  protected datasetId: string;
  protected recursive: any;
  formGroup: FormGroup;
  error: string;
  route_success: string[] = ['storage'];
  isEntity = true;
  private entityForm: EntityFormComponent;
  protected userField: FieldConfig;
  protected groupField: FieldConfig;

  fieldSets: FieldSet[] = [
    {
      name: helptext.heading_dataset_path,
      label: true,
      config: [
        {
          type: 'input',
          name: 'id',
          placeholder: helptext.dataset_permissions_id_placeholder,
          readonly: true,
        },
      ],
      width: '100%',
    },
    {
      name: 'divider',
      divider: true,
    },
    {
      name: helptext.heading_owner,
      label: true,
      config: [
        {
          type: 'combobox',
          name: 'user',
          placeholder: helptext.dataset_permissions_user_placeholder,
          tooltip: helptext.dataset_permissions_user_tooltip,
          options: [],
          searchOptions: [],
          parent: this,
          updater: this.updateUserSearchOptions,
          loadMoreOptions: this.loadMoreOptions,
        },
        {
          type: 'checkbox',
          name: 'apply_user',
          placeholder: helptext.apply_user.placeholder,
          tooltip: helptext.apply_user.tooltip,
          value: false,
        },
        {
          type: 'combobox',
          name: 'group',
          placeholder: helptext.dataset_permissions_group_placeholder,
          tooltip: helptext.dataset_permissions_group_tooltip,
          options: [],
          searchOptions: [],
          parent: this,
          updater: this.updateGroupSearchOptions,
          loadMoreOptions: this.loadMoreGroupOptions,
        },
        {
          type: 'checkbox',
          name: 'apply_group',
          placeholder: helptext.apply_group.placeholder,
          tooltip: helptext.apply_group.tooltip,
          value: false,
        },
      ],
      width: '50%',
    },
    {
      name: helptext.heading_access,
      label: true,
      config: [
        {
          type: 'permissions',
          name: 'mode',
          placeholder: helptext.dataset_permissions_mode_placeholder,
          tooltip: helptext.dataset_permissions_mode_tooltip,
          isHidden: false,
        },
      ],
      width: '50%',
    },
    {
      name: 'divider',
      divider: true,
    },
    {
      name: helptext.heading_advanced,
      label: true,
      config: [
        {
          type: 'checkbox',
          name: 'recursive',
          placeholder: helptext.dataset_permissions_recursive_placeholder,
          tooltip: helptext.dataset_permissions_recursive_tooltip,
          value: false,
        },
        {
          type: 'checkbox',
          name: 'traverse',
          placeholder: helptext.dataset_permissions_traverse_placeholder,
          tooltip: helptext.dataset_permissions_traverse_tooltip,
          value: false,
        },
      ],
      width: '100%',
    },
    {
      name: 'divider',
      divider: true,
    },
  ];

  custActions = [
    {
      id: 'use_acl',
      name: helptext.acl_manager_button,
      function: () => {
        this.ws.call('filesystem.getacl', [this.datasetPath]).pipe(untilDestroyed(this)).subscribe((acl) => {
          if (acl.acltype === AclType.Posix1e) {
            this.router.navigate(new Array('/').concat([
              'storage', 'id', this.datasetId.split('/')[0], 'dataset',
              'posix-acl', this.datasetId,
            ]));
          } else {
            this.router.navigate(new Array('/').concat([
              'storage', 'id', this.datasetId.split('/')[0], 'dataset',
              'acl', this.datasetId,
            ]));
          }
        });
      },
    },
  ];

  protected datasetMode: string;

  constructor(
    protected aroute: ActivatedRoute,
    protected ws: WebSocketService,
    protected userService: UserService,
    protected storageService: StorageService,
    protected mdDialog: MatDialog,
    protected dialog: DialogService,
    protected router: Router,
  ) { }

  preInit(entityEdit: EntityFormComponent): void {
    entityEdit.isNew = true; // remove me when we find a way to get the permissions
    this.aroute.params.pipe(untilDestroyed(this)).subscribe((params) => {
      this.datasetId = params['pk'];
      this.datasetPath = '/mnt/' + this.datasetId;
      const idField = _.find(this.fieldSets.find((set) => set.name === helptext.heading_dataset_path).config, { name: 'id' });
      idField.value = this.datasetPath;
    });

    this.userService.userQueryDSCache().pipe(untilDestroyed(this)).subscribe((items) => {
      const users: Option[] = [];
      for (let i = 0; i < items.length; i++) {
        users.push({ label: items[i].username, value: items[i].username });
      }
      this.userField = _.find(this.fieldSets.find((set) => set.name === helptext.heading_owner).config, { name: 'user' });
      this.userField.options = users;
    });

    this.userService.groupQueryDSCache().pipe(untilDestroyed(this)).subscribe((groups) => {
      const groupOptions: Option[] = [];
      for (let i = 0; i < groups.length; i++) {
        groupOptions.push({ label: groups[i].group, value: groups[i].group });
      }
      this.groupField = _.find(this.fieldSets.find((set) => set.name === helptext.heading_owner).config, { name: 'group' });
      this.groupField.options = groupOptions;
    });
  }

  afterInit(entityEdit: EntityFormComponent): void {
    this.entityForm = entityEdit;
    entityEdit.formGroup.get('id').setValue(this.datasetPath);
    this.storageService.filesystemStat(this.datasetPath).pipe(untilDestroyed(this)).subscribe((stat) => {
      this.datasetMode = stat.mode.toString(8).substring(2, 5);
      entityEdit.formGroup.controls['mode'].setValue(this.datasetMode);
      entityEdit.formGroup.controls['user'].setValue(stat.user);
      entityEdit.formGroup.controls['group'].setValue(stat.group);
    });
    entityEdit.formGroup.controls['id'].setValue(this.datasetPath);

    const recursive = entityEdit.formGroup.controls['recursive'];
    recursive.valueChanges.pipe(untilDestroyed(this)).subscribe((value: boolean) => {
      if (value === true) {
        this.dialog.confirm({
          title: T('Warning'),
          message: T('Setting permissions recursively will affect this directory and any others below it. This might make data inaccessible.'),
        }).pipe(
          filter(Boolean),
          untilDestroyed(this),
        ).subscribe(() => {
          recursive.setValue(false);
        });
      }
    });
  }

  updateGroupSearchOptions(value = '', parent: this): void {
    parent.userService.groupQueryDSCache(value).pipe(untilDestroyed(this)).subscribe((groups) => {
      const groupOptions: Option[] = [];
      for (let i = 0; i < groups.length; i++) {
        groupOptions.push({ label: groups[i].group, value: groups[i].group });
      }
      parent.groupField.searchOptions = groupOptions;
    });
  }

  updateUserSearchOptions(value = '', parent: this): void {
    parent.userService.userQueryDSCache(value).pipe(untilDestroyed(this)).subscribe((items) => {
      const users = [];
      for (let i = 0; i < items.length; i++) {
        users.push({ label: items[i].username, value: items[i].username });
      }
      parent.userField.searchOptions = users;
    });
  }

  beforeSubmit(data: any): void {
    if (!data.apply_user) {
      delete data.user;
    }
    if (!data.apply_group) {
      delete data.group;
    }
    delete data.apply_user;
    delete data.apply_group;

    data['acl'] = [];

    data['options'] = {
      stripacl: true,
      recursive: data['recursive'],
      traverse: data['traverse'],
    };
    delete data['recursive'];
    delete data['traverse'];

    if (data['mode'] === this.datasetMode) {
      delete data['mode'];
      data['options']['stripacl'] = false;
    }
  }

  customSubmit(data: any): void {
    const dialogRef = this.mdDialog.open(EntityJobComponent, { data: { title: T('Saving Permissions') } });
    dialogRef.componentInstance.setDescription(T('Saving Permissions...'));
    dialogRef.componentInstance.setCall(this.updateCall, [this.datasetId, data]);
    dialogRef.componentInstance.submit();
    dialogRef.componentInstance.success.pipe(untilDestroyed(this)).subscribe(() => {
      this.entityForm.success = true;
      dialogRef.close();
      this.router.navigate(new Array('/').concat(
        this.route_success,
      ));
    });
    dialogRef.componentInstance.failure.pipe(untilDestroyed(this)).subscribe((err: any) => {
      console.error(err);
    });
  }

  loadMoreOptions(length: number, parent: this, searchText: string): void {
    parent.userService.userQueryDSCache(searchText, length)
      .pipe(untilDestroyed(this))
      .subscribe((items) => {
        const users = [];
        for (let i = 0; i < items.length; i++) {
          users.push({ label: items[i].username, value: items[i].username });
        }
        if (searchText == '') {
          parent.userField.options = parent.userField.options.concat(users);
        } else {
          parent.userField.searchOptions = parent.userField.searchOptions.concat(users);
        }
      });
  }

  loadMoreGroupOptions(length: number, parent: this, searchText: string): void {
    parent.userService.groupQueryDSCache(searchText, false, length)
      .pipe(untilDestroyed(this))
      .subscribe((groups) => {
        const groupOptions: Option[] = [];
        for (let i = 0; i < groups.length; i++) {
          groupOptions.push({ label: groups[i].group, value: groups[i].group });
        }
        if (searchText == '') {
          parent.groupField.options = parent.groupField.options.concat(groupOptions);
        } else {
          parent.groupField.searchOptions = parent.groupField.searchOptions.concat(groupOptions);
        }
      });
  }
}
