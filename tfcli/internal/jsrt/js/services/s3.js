/* ========================================================================== */
// S3
/* ========================================================================== */

sections.push({
    'category': 'Storage',
    'service': 'S3',
    'resourcetypes': {
        'Buckets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Bucket Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'creationdate',
                        title: 'Creation Date',
                        sortable: true,
                        editable: true,
                        formatter: timeAgoFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Bucket Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Bucket Name',
                        field: 'bucketname',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'policylength',
                        title: 'Policy Length',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Access Points': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'bucketname',
                        title: 'Bucket Name',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Storage Lenses': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'isenabled',
                        title: 'Enabled',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Account Public Access Block': {
            'terraformonly': true,
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Account ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'blockpublicacls',
                        title: 'Block Public ACLs',
                        sortable: true,
                        editable: true,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Outpost Buckets': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'outpostid',
                        title: 'Outpost ID',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Outpost Bucket Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    }
                ],
                [
                    // none
                ]
            ]
        },
        'Outpost Access Points': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'bucketname',
                        title: 'Bucket Name',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Outpost Endpoints': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'ID',
                        field: 'id',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'outpostid',
                        title: 'Outpost ID',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Object Lambda Access Points': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    }
                ],
                [
                    // none
                ]
            ]
        },
        'Object Lambda Access Point Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Access Point',
                        field: 'accesspoint',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    }
                ],
                [
                    // none
                ]
            ]
        },
        'Multi-Region Access Points': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    },
                    {
                        title: 'Properties',
                        colspan: 4,
                        align: 'center'
                    }
                ],
                [
                    {
                        field: 'alias',
                        title: 'Alias',
                        sortable: true,
                        editable: true,
                        formatter: byteSizeFormatter,
                        footerFormatter: textFormatter,
                        align: 'center'
                    }
                ]
            ]
        },
        'Multi-Region Access Point Policies': {
            'columns': [
                [
                    {
                        field: 'state',
                        checkbox: true,
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle'
                    },
                    {
                        title: 'Name',
                        field: 'name',
                        rowspan: 2,
                        align: 'center',
                        valign: 'middle',
                        sortable: true,
                        formatter: primaryFieldFormatter,
                        footerFormatter: textFormatter
                    }
                ],
                [
                    // none
                ]
            ]
        }
    }
});

async function updateDatatableStorageS3() {
    blockUI('#section-storage-s3-buckets-datatable');
    blockUI('#section-storage-s3-bucketpolicies-datatable');
    blockUI('#section-storage-s3-accesspoints-datatable');
    blockUI('#section-storage-s3-storagelenses-datatable');
    blockUI('#section-storage-s3-accountpublicaccessblock-datatable');
    blockUI('#section-storage-s3-outpostbuckets-datatable');
    blockUI('#section-storage-s3-outpostbucketpolicies-datatable');
    blockUI('#section-storage-s3-outpostaccesspoints-datatable');
    blockUI('#section-storage-s3-outpostendpoints-datatable');
    blockUI('#section-storage-s3-objectlambdaaccesspoints-datatable');
    blockUI('#section-storage-s3-objectlambdaaccesspointpolicies-datatable');
    blockUI('#section-storage-s3-multiregionaccesspoints-datatable');
    blockUI('#section-storage-s3-multiregionaccesspointpolicies-datatable');

    await sdkcall("S3", "listBuckets", {
        // no params
    }, true).then(async (data) => {
        $('#section-storage-s3-buckets-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-bucketpolicies-datatable').deferredBootstrapTable('removeAll');

        await Promise.all(data.Buckets.map(bucket => {
            return Promise.all([
                sdkcall("S3", "getBucketAccelerateConfiguration", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['AccelerateConfiguration'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketTagging", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Tags'] = data.TagSet;
                }).catch(() => { }),
                sdkcall("S3", "getBucketEncryption", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Encryption'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketCors", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Cors'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketLifecycleConfiguration", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Lifecycle'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketLogging", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Logging'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketNotificationConfiguration", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['NotificationConfiguration'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketReplication", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Replication'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketVersioning", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Versioning'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getBucketWebsite", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['Website'] = data;
                }).catch(() => { }),
                sdkcall("S3", "listBucketAnalyticsConfigurations", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['AnalyticsConfigurations'] = data;
                }).catch(() => { }),
                sdkcall("S3", "listBucketInventoryConfigurations", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['InventoryConfigurations'] = data;
                }).catch(() => { }),
                sdkcall("S3", "listBucketMetricsConfigurations", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['MetricsConfigurations'] = data;
                }).catch(() => { }),
                sdkcall("S3", "getObjectLockConfiguration", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['ObjectLockConfiguration'] = data.ObjectLockConfiguration;
                }).catch(() => { }),
                sdkcall("S3", "listBucketIntelligentTieringConfigurations", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['IntelligentTieringConfiguration'] = data.IntelligentTieringConfigurationList;
                }).catch(() => { }),
                sdkcall("S3", "getBucketOwnershipControls", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['OwnershipControls'] = data.OwnershipControls;
                }).catch(() => { }),
                sdkcall("S3", "getPublicAccessBlock", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    bucket['PublicAccessBlockConfiguration'] = data.PublicAccessBlockConfiguration;
                }).catch(() => { })
            ]).then(async () => {
                $('#section-storage-s3-buckets-datatable').deferredBootstrapTable('append', [{
                    f2id: bucket.Name,
                    f2type: 's3.bucket',
                    f2data: bucket,
                    f2region: region,
                    f2link: 'https://console.aws.amazon.com/s3/home?region=' + region + '&bucket=' + bucket.Name,
                    name: bucket.Name,
                    creationdate: bucket.CreationDate
                }]);

                await sdkcall("S3", "getBucketPolicy", {
                    Bucket: bucket.Name
                }, false).then((data) => {
                    data['Bucket'] = bucket.Name;
                    $('#section-storage-s3-bucketpolicies-datatable').deferredBootstrapTable('append', [{
                        f2id: bucket.Name + " BucketPolicy",
                        f2type: 's3.bucketpolicy',
                        f2data: data,
                        f2region: region,
                        bucketname: bucket.Name,
                        policy: data.Policy,
                        policylength: data.Policy.length
                    }]);
                }).catch(() => { });
            });
        }));

        unblockUI('#section-storage-s3-buckets-datatable');
        unblockUI('#section-storage-s3-bucketpolicies-datatable');
    });

    await sdkcall("STS", "getCallerIdentity", {
        // no params
    }, true).then(async (data) => {
        $('#section-storage-s3-accesspoints-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-storagelenses-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-outpostbuckets-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-outpostbucketpolicies-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-outpostaccesspoints-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-outpostendpoints-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-multiregionaccesspoints-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-multiregionaccesspointpolicies-datatable').deferredBootstrapTable('removeAll');
        $('#section-storage-s3-accountpublicaccessblock-datatable').deferredBootstrapTable('removeAll');

        var accountId = data.Account;

        await sdkcall("S3Control", "getPublicAccessBlock", {
            AccountId: accountId
        }, false).then((data) => {
            if (data.PublicAccessBlockConfiguration) {
                $('#section-storage-s3-accountpublicaccessblock-datatable').deferredBootstrapTable('append', [{
                    f2id: accountId,
                    f2type: 's3.accountpublicaccessblock',
                    f2data: {
                        'AccountId': accountId,
                        'PublicAccessBlockConfiguration': data.PublicAccessBlockConfiguration
                    },
                    f2region: region,
                    id: accountId,
                    blockpublicacls: data.PublicAccessBlockConfiguration.BlockPublicAcls
                }]);
            }
        }).catch(() => { });

        await sdkcall("S3Control", "listAccessPoints", {
            AccountId: accountId
        }, false).then(async (data) => {
            await Promise.all(data.AccessPointList.map(async (accessPoint) => {
                return sdkcall("S3Control", "getAccessPoint", {
                    AccountId: accountId,
                    Name: accessPoint.Name
                }, false).then(async (data) => {
                    await sdkcall("S3Control", "getAccessPointPolicy", {
                        AccountId: accountId,
                        Name: accessPoint.Name
                    }, false).then(async (policydata) => {
                        data['Policy'] = policydata.Policy;
                    });

                    data['AccountId'] = accountId;

                    $('#section-storage-s3-accesspoints-datatable').deferredBootstrapTable('append', [{
                        f2id: data.Name,
                        f2type: 's3.accesspoint',
                        f2data: data,
                        f2region: region,
                        name: data.Name,
                        bucketname: data.Bucket
                    }]);
                });
            }));
        }).catch(() => { });

        await sdkcall("S3Control", "listMultiRegionAccessPoints", {
            AccountId: accountId
        }, false).then(async (data) => {
            await Promise.all(data.AccessPoints.map(async (accessPoint) => {
                return sdkcall("S3Control", "getMultiRegionAccessPoint", {
                    AccountId: accountId,
                    Name: accessPoint.Name
                }, false).then(async (data) => {
                    data.AccessPoint['AccountId'] = accountId;

                    $('#section-storage-s3-multiregionaccesspoints-datatable').deferredBootstrapTable('append', [{
                        f2id: data.AccessPoint.Name + " MRAP",
                        f2type: 's3.multiregionaccesspoint',
                        f2data: data.AccessPoint,
                        f2region: region,
                        name: data.AccessPoint.Name,
                        alias: data.AccessPoint.Alias
                    }]);

                    await sdkcall("S3Control", "getMultiRegionAccessPointPolicy", {
                        AccountId: accountId,
                        Name: accessPoint.Name
                    }, false).then(async (policydata) => {
                        data.AccessPoint['Policy'] = policydata.Policy;

                        $('#section-storage-s3-multiregionaccesspointpolicies-datatable').deferredBootstrapTable('append', [{
                            f2id: data.AccessPoint.Name + " MRAP Policy",
                            f2type: 's3.multiregionaccesspointpolicy',
                            f2data: data.AccessPoint,
                            f2region: region,
                            name: data.AccessPoint.Name
                        }]);
                    });
                });
            }));
        }).catch(() => { });

        await sdkcall("S3Control", "listStorageLensConfigurations", {
            AccountId: accountId
        }, true).then(async (data) => {
            $('#section-storage-s3-storagelenses-datatable').deferredBootstrapTable('removeAll');

            await Promise.all(data.StorageLensConfigurationList.map(config => {
                return sdkcall("S3Control", "getStorageLensConfiguration", {
                    ConfigId: config.Id,
                    AccountId: accountId
                }, true).then((data) => {
                    $('#section-storage-s3-storagelenses-datatable').deferredBootstrapTable('append', [{
                        f2id: data.StorageLensConfiguration.StorageLensArn,
                        f2type: 's3.storagelens',
                        f2data: data,
                        f2region: region,
                        id: data.StorageLensConfiguration.TemplateName,
                        isenabled: data.StorageLensConfiguration.IsEnabled
                    }]);
                });
            }));
        }).catch(() => { });

        await sdkcall("S3Control", "listRegionalBuckets", {
            AccountId: accountId
        }, false).then(async (data) => {
            $('#section-storage-s3-outpostbuckets-datatable').deferredBootstrapTable('removeAll');
            $('#section-storage-s3-outpostbucketpolicies-datatable').deferredBootstrapTable('removeAll');

            await Promise.all(data.RegionalBucketList.map(async (bucket) => {
                await sdkcall("S3Control", "getBucket", {
                    Bucket: bucket.Bucket,
                    AccountId: accountId
                }, true).then(async (data) => {
                    data['OutpostId'] = bucket.OutpostId;

                    await sdkcall("S3Control", "getBucketLifecycleConfiguration", {
                        Bucket: bucket.Bucket,
                        AccountId: accountId
                    }, true).then((lifecycledata) => {
                        data['LifecycleConfiguration'] = lifecycledata;
                    });

                    $('#section-storage-s3-outpostbuckets-datatable').deferredBootstrapTable('append', [{
                        f2id: data.Bucket,
                        f2type: 's3.outpostbucket',
                        f2data: data,
                        f2region: region,
                        name: data.Bucket,
                        outpostid: bucket.OutpostId
                    }]);
                });

                return sdkcall("S3Control", "getBucketPolicy", {
                    Bucket: bucket.Bucket,
                    AccountId: accountId
                }, true).then((data) => {
                    data['Bucket'] = bucket.Bucket;

                    $('#section-storage-s3-outpostbucketpolicies-datatable').deferredBootstrapTable('append', [{
                        f2id: data.Bucket + " Policy",
                        f2type: 's3.outpostbucketpolicy',
                        f2data: data,
                        f2region: region,
                        name: data.Bucket
                    }]);
                });
            }));
        }).catch(() => { });

        await sdkcall("S3Control", "listAccessPoints", {
            AccountId: accountId
        }, false).then(async (data) => {
            $('#section-storage-s3-outpostaccesspoints-datatable').deferredBootstrapTable('removeAll');

            await Promise.all(data.AccessPointList.map(async (accesspoint) => {
                return sdkcall("S3Control", "getAccessPoint", {
                    Name: accesspoint.Name,
                    AccountId: accountId
                }, true).then(async (data) => {
                    await sdkcall("S3Control", "getAccessPointPolicy", {
                        Name: accesspoint.Name,
                        AccountId: accountId
                    }, false).then((policydata) => {
                        data['Policy'] = policydata.Policy;
                    }).catch(() => { });

                    data['AccessPointArn'] = accesspoint.AccessPointArn;

                    $('#section-storage-s3-outpostaccesspoints-datatable').deferredBootstrapTable('append', [{
                        f2id: accesspoint.AccessPointArn,
                        f2type: 's3.outpostaccesspoint',
                        f2data: data,
                        f2region: region,
                        name: data.Name,
                        bucketname: data.Bucket
                    }]);
                });
            }));
        }).catch(() => { });

        await sdkcall("S3Control", "listAccessPointsForObjectLambda", {
            AccountId: accountId
        }, true).then(async (data) => {
            $('#section-storage-s3-objectlambdaaccesspoints-datatable').deferredBootstrapTable('removeAll');
            $('#section-storage-s3-objectlambdaaccesspointpolicies-datatable').deferredBootstrapTable('removeAll');

            await Promise.all(data.ObjectLambdaAccessPointList.map(async (accesspoint) => {
                await sdkcall("S3Control", "getAccessPointConfigurationForObjectLambda", {
                    Name: accesspoint.Name,
                    AccountId: accountId
                }, true).then((data) => {
                    data['Name'] = accesspoint.Name;
                    data['Arn'] = accesspoint.ObjectLambdaAccessPointArn;

                    $('#section-storage-s3-objectlambdaaccesspoints-datatable').deferredBootstrapTable('append', [{
                        f2id: accesspoint.ObjectLambdaAccessPointArn,
                        f2type: 's3.objectlambdaaccesspoint',
                        f2data: data,
                        f2region: region,
                        name: accesspoint.Name
                    }]);
                });

                return sdkcall("S3Control", "getAccessPointPolicyForObjectLambda", {
                    Name: accesspoint.Name,
                    AccountId: accountId
                }, true).then((data) => {
                    data['ObjectLambdaAccessPoint'] = accesspoint.Name;

                    $('#section-storage-s3-objectlambdaaccesspointpolicies-datatable').deferredBootstrapTable('append', [{
                        f2id: accesspoint.ObjectLambdaAccessPointArn + " Policy",
                        f2type: 's3.objectlambdaaccesspointpolicy',
                        f2data: data,
                        f2region: region,
                        accesspoint: accesspoint.Name
                    }]);
                });
            }));
        }).catch(() => { });
    });

    await sdkcall("S3Outposts", "listEndpoints", {
        // no params
    }, false).then(async (data) => {
        $('#section-storage-s3-outpostendpoints-datatable').deferredBootstrapTable('removeAll');

        data.Endpoints.forEach(async (endpoint) => {
            var endpointid = endpoint.EndpointArn.split("/").pop();

            if (endpoint.NetworkInterfaces && endpoint.NetworkInterfaces[0] && endpoint.NetworkInterfaces[0].NetworkInterfaceId) {
                await sdkcall("EC2", "describeNetworkInterfaces", {
                    NetworkInterfaceIds: [endpoint.NetworkInterfaces[0].NetworkInterfaceId]
                }, true).then(async (nicdata) => {
                    if (nicdata.NetworkInterfaces && nicdata.NetworkInterfaces[0] && nicdata.NetworkInterfaces[0].Groups && nicdata.NetworkInterfaces[0].Groups[0]) {
                        endpoint['SecurityGroupId'] = nicdata.NetworkInterfaces[0].Groups[0].GroupId;
                        endpoint['SubnetId'] = nicdata.NetworkInterfaces[0].SubnetId;

                        $('#section-storage-s3-outpostendpoints-datatable').deferredBootstrapTable('append', [{
                            f2id: endpoint.EndpointArn,
                            f2type: 's3.outpostendpoint',
                            f2data: endpoint,
                            f2region: region,
                            id: endpointid,
                            outpostid: data.OutpostsId
                        }]);
                    }
                });
            }
        });
    }).catch(() => { });

    unblockUI('#section-storage-s3-accesspoints-datatable');
    unblockUI('#section-storage-s3-storagelenses-datatable');
    unblockUI('#section-storage-s3-accountpublicaccessblock-datatable');
    unblockUI('#section-storage-s3-outpostbuckets-datatable');
    unblockUI('#section-storage-s3-outpostbucketpolicies-datatable');
    unblockUI('#section-storage-s3-outpostaccesspoints-datatable');
    unblockUI('#section-storage-s3-outpostendpoints-datatable');
    unblockUI('#section-storage-s3-objectlambdaaccesspoints-datatable');
    unblockUI('#section-storage-s3-objectlambdaaccesspointpolicies-datatable');
    unblockUI('#section-storage-s3-multiregionaccesspoints-datatable');
    unblockUI('#section-storage-s3-multiregionaccesspointpolicies-datatable');
}

service_mapping_functions.push(function(reqParams, obj, tracked_resources){
    if (obj.type == "s3.bucket") {
        var s3LogicalId = getResourceName('s3', obj.id, 'AWS::S3::Bucket');
        reqParams.cfn['BucketName'] = obj.data.Name;
        reqParams.tf['bucket'] = obj.data.Name;
        reqParams.cfn['Tags'] = stripAWSTags(obj.data.Tags);
        if (obj.data.AccelerateConfiguration && obj.data.AccelerateConfiguration.Status) {
            reqParams.cfn['AccelerateConfiguration'] = {
                'AccelerationStatus': obj.data.AccelerateConfiguration.Status
            };
        }
        if (obj.data.Encryption && obj.data.Encryption.ServerSideEncryptionConfiguration && obj.data.Encryption.ServerSideEncryptionConfiguration.Rules) {
            var rules = [];
            obj.data.Encryption.ServerSideEncryptionConfiguration.Rules.forEach(rule => {
                rules.push({
                    'ServerSideEncryptionByDefault': rule.ApplyServerSideEncryptionByDefault,
                    'BucketKeyEnabled': rule.BucketKeyEnabled
                });
            });
            reqParams.cfn['BucketEncryption'] = {
                'ServerSideEncryptionConfiguration': rules
            };
        }
        if (obj.data.Lifecycle && obj.data.Lifecycle.Rules) {
            var lifecyclerules = [];

            obj.data.Lifecycle.Rules.forEach(rule => {
                var lifecyclerule = {
                    'AbortIncompleteMultipartUpload': rule.AbortIncompleteMultipartUpload,
                    'Id': rule.ID,
                    'Status': rule.Status
                };

                if (rule.Expiration) {
                    if (rule.Expiration.Date) {
                        lifecyclerule['ExpirationDate'] = rule.Expiration.Date.toISOString();
                    }
                    lifecyclerule['ExpirationInDays'] = rule.Expiration.Days;
                }

                if (rule.NoncurrentVersionExpiration) {
                    lifecyclerule['NoncurrentVersionExpirationInDays'] = rule.NoncurrentVersionExpiration.NoncurrentDays;
                }

                if (rule.NoncurrentVersionTransitions) {
                    lifecyclerule['NoncurrentVersionTransitions'] = [];
                    rule.NoncurrentVersionTransitions.forEach(transition => {
                        lifecyclerule['NoncurrentVersionTransitions'].push({
                            'TransitionInDays': transition.NoncurrentDays,
                            'StorageClass': transition.StorageClass
                        });
                    });
                }

                if (rule.Filter && rule.Filter.Tag) {
                    lifecyclerule['TagFilters'] = [rule.Filter.Tag];
                    if (rule.Filter.And && rule.Filter.And.Tags) {
                        lifecyclerule['TagFilters'] = lifecyclerule['TagFilters'].concat(rule.Filter.And.Tags);
                    }
                }

                if (rule.Filter && rule.Filter.Prefix) {
                    lifecyclerule['Prefix'] = rule.Filter.Prefix;
                }

                if (rule.Transitions) {
                    lifecyclerule['Transitions'] = [];
                    rule.Transitions.forEach(transition => {
                        var transitiondate = null;
                        if (transition.Date) {
                            transitiondate = transition.Date.toISOString();
                        }
                        lifecyclerule['Transitions'].push({
                            'TransitionInDays': transition.Days,
                            'TransitionDate': transitiondate,
                            'StorageClass': transition.StorageClass
                        });
                    });
                }

                lifecyclerules.push(lifecyclerule);
            });

            reqParams.cfn['LifecycleConfiguration'] = {
                'Rules': lifecyclerules
            };
        }
        if (obj.data.Cors && obj.data.Cors.CORSRules) {
            var corsrules = [];
            obj.data.Cors.CORSRules.forEach(corsrule => {
                corsrules.push({
                    'AllowedHeaders': corsrule.AllowedHeaders,
                    'AllowedMethods': corsrule.AllowedMethods,
                    'AllowedOrigins': corsrule.AllowedOrigins,
                    'ExposedHeaders': corsrule.ExposedHeaders,
                    'MaxAgeSeconds': corsrule.MaxAge
                });
            });
            reqParams.cfn['CorsConfiguration'] = {
                'CorsRules': corsrules
            };
        }
        if (obj.data.Logging && obj.data.Logging.LoggingEnabled) {
            reqParams.cfn['LoggingConfiguration'] = {
                'DestinationBucketName': obj.data.Logging.LoggingEnabled.TargetBucket,
                'LogFilePrefix': obj.data.Logging.LoggingEnabled.TargetPrefix
            };
        }
        if (obj.data.NotificationConfiguration && (obj.data.NotificationConfiguration.TopicConfigurations || obj.data.NotificationConfiguration.QueueConfigurations || obj.data.NotificationConfiguration.LambdaFunctionConfigurations)) {
            var topicconfigurations = null;
            var queueconfigurations = null;
            var lambdafunctionconfigurations = null;
            if (obj.data.NotificationConfiguration.TopicConfigurations) {
                topicconfigurations = [];
                obj.data.NotificationConfiguration.TopicConfigurations.forEach(configuration => {
                    var filter = null;
                    if (configuration.Filter && configuration.Filter.Key && configuration.Filter.Key.FilterRules) {
                        filter = {
                            'S3Key': {
                                'Rules': configuration.Filter.Key.FilterRules
                            }
                        };
                    }
                    configuration.Events.forEach(event => {
                        topicconfigurations.push({
                            'Event': event,
                            'Filter': filter,
                            'Topic': configuration.TopicArn
                        });
                    });
                });
            }
            if (obj.data.NotificationConfiguration.QueueConfigurations) {
                queueconfigurations = [];
                obj.data.NotificationConfiguration.QueueConfigurations.forEach(configuration => {
                    var filter = null;
                    if (configuration.Filter && configuration.Filter.Key && configuration.Filter.Key.FilterRules) {
                        filter = {
                            'S3Key': {
                                'Rules': configuration.Filter.Key.FilterRules
                            }
                        };
                    }
                    configuration.Events.forEach(event => {
                        queueconfigurations.push({
                            'Event': event,
                            'Filter': filter,
                            'Queue': configuration.QueueArn
                        });
                    });
                });
            }
            if (obj.data.NotificationConfiguration.LambdaFunctionConfigurations) {
                lambdafunctionconfigurations = [];
                obj.data.NotificationConfiguration.LambdaFunctionConfigurations.forEach(configuration => {
                    var filter = null;
                    if (configuration.Filter && configuration.Filter.Key && configuration.Filter.Key.FilterRules) {
                        filter = {
                            'S3Key': {
                                'Rules': configuration.Filter.Key.FilterRules
                            }
                        };
                    }
                    configuration.Events.forEach(event => {
                        lambdafunctionconfigurations.push({
                            'Event': event,
                            'Filter': filter,
                            'Function': configuration.LambdaFunctionArn
                        });
                    });
                });
            }

            if (topicconfigurations.length || queueconfigurations.length || lambdafunctionconfigurations.length) {
                reqParams.cfn['NotificationConfiguration'] = {
                    'TopicConfigurations': topicconfigurations,
                    'QueueConfigurations': queueconfigurations,
                    'LambdaConfigurations': lambdafunctionconfigurations
                };
            }
        }
        if (obj.data.Replication && obj.data.Replication.ReplicationConfiguration) {
            var rules = [];
            obj.data.Replication.ReplicationConfiguration.Rules.forEach(rule => {
                rules.push({
                    'Id': rule.ID,
                    'Prefix': rule.Prefix,
                    'Status': rule.Status,
                    'Destination': rule.Destination,
                    'SourceSelectionCriteria': rule.SourceSelectionCriteria
                });
            });
            reqParams.cfn['ReplicationConfiguration'] = {
                'Role': obj.data.Replication.ReplicationConfiguration.Role,
                'Rules': rules
            };
        }
        if (obj.data.Versioning && obj.data.Versioning.Status) {
            reqParams.cfn['VersioningConfiguration'] = {
                'Status': obj.data.Versioning.Status
            };
        }
        if (obj.data.Website && obj.data.Website.IndexDocument) {
            var errordocument = null;
            var routingrules = null;

            if (obj.data.Website.ErrorDocument) {
                errordocument = obj.data.Website.ErrorDocument.Key;
            }
            if (obj.data.Website.RoutingRules) {
                routingrules = [];
                obj.data.Website.RoutingRules.forEach(routingrule => {
                    routingrules.push({
                        'RedirectRule': routingrule.Redirect,
                        'RoutingRuleCondition': routingrule.Condition
                    });
                });
            }

            reqParams.cfn['WebsiteConfiguration'] = {
                'IndexDocument': obj.data.Website.IndexDocument.Suffix,
                'RedirectAllRequestsTo': obj.data.Website.RedirectAllRequestsTo,
                'ErrorDocument': errordocument,
                'RoutingRules': routingrules
            };
        }
        if (obj.data.AnalyticsConfigurations && obj.data.AnalyticsConfigurations.AnalyticsConfigurationList) {
            reqParams.cfn['AnalyticsConfigurations'] = [];
            obj.data.AnalyticsConfigurations.AnalyticsConfigurationList.forEach(config => {
                var prefix = null;
                var tagfilters = null;
                var storageclassanalysis = null;
                if (config.Filter) {
                    if (config.Filter.Tag) {
                        tagfilters = [config.Filter.Tag];
                        if (config.Filter.And && config.Filter.And.Tags) {
                            tagfilters = tagfilters.concat(config.Filter.And.Tags);
                        }
                    }
                    prefix = config.Filter.Prefix;
                }
                if (config.StorageClassAnalysis.DataExport) {
                    storageclassanalysis = {
                        'DataExport': {
                            'OutputSchemaVersion': config.StorageClassAnalysis.DataExport.OutputSchemaVersion,
                            'Destination': {
                                'BucketAccountId': config.StorageClassAnalysis.DataExport.Destination.S3BucketDestination.BucketAccountId,
                                'BucketArn': config.StorageClassAnalysis.DataExport.Destination.S3BucketDestination.Bucket,
                                'Format': config.StorageClassAnalysis.DataExport.Destination.S3BucketDestination.Format,
                                'Prefix': config.StorageClassAnalysis.DataExport.Destination.S3BucketDestination.Prefix
                            }
                        }
                    };
                }
                reqParams.cfn['AnalyticsConfigurations'].push({
                    'Id': config.Id,
                    'Prefix': prefix,
                    'TagFilters': tagfilters,
                    'StorageClassAnalysis': storageclassanalysis
                });
            });
        }
        if (obj.data.IntelligentTieringConfiguration) {
            reqParams.cfn['IntelligentTieringConfiguration'] = [];
            obj.data.IntelligentTieringConfiguration.forEach(itconfig => {
                reqParams.cfn['IntelligentTieringConfiguration'].push({
                    'Id': itconfig.Id,
                    'Prefix': (itconfig.Filter ? itconfig.Filter.Prefix : null),
                    'Status': itconfig.Status,
                    'TagFilters': (itconfig.Filter ? itconfig.Filter.Tag : null),
                    'Tierings': itconfig.Tierings
                });
            });
        }
        if (obj.data.InventoryConfigurations && obj.data.InventoryConfigurations.InventoryConfigurationList) {
            reqParams.cfn['InventoryConfigurations'] = [];
            obj.data.InventoryConfigurations.InventoryConfigurationList.forEach(config => {
                var prefix = null;
                if (config.Filter) {
                    prefix = config.Filter.Prefix;
                }

                reqParams.cfn['InventoryConfigurations'].push({
                    'Destination': {
                        'BucketAccountId': config.Destination.S3BucketDestination.AccountId,
                        'BucketArn': config.Destination.S3BucketDestination.Bucket,
                        'Format': config.Destination.S3BucketDestination.Format,
                        'Prefix': config.Destination.S3BucketDestination.Prefix
                    },
                    'Enabled': config.IsEnabled,
                    'Id': config.Id,
                    'IncludedObjectVersions': config.IncludedObjectVersions,
                    'OptionalFields': config.OptionalFields,
                    'Prefix': prefix,
                    'ScheduleFrequency': config.Schedule.Frequency
                });
            });
        }
        if (obj.data.MetricsConfigurations && obj.data.MetricsConfigurations.MetricsConfigurationList) {
            reqParams.cfn['MetricsConfigurations'] = [];
            obj.data.MetricsConfigurations.MetricsConfigurationList.forEach(config => {
                var prefix = null;
                var tagfilters = null;
                if (config.Filter) {
                    if (config.Filter.Tag) {
                        tagfilters = [config.Filter.Tag];
                        if (config.Filter.And && config.Filter.And.Tags) {
                            tagfilters = tagfilters.concat(config.Filter.And.Tags);
                        }
                    }
                    prefix = config.Filter.Prefix;
                }
                reqParams.cfn['MetricsConfigurations'].push({
                    'Id': config.Id,
                    'Prefix': prefix,
                    'TagFilters': tagfilters
                });
            });
        }
        if (obj.data.ObjectLockConfiguration) {
            reqParams.cfn['ObjectLockConfiguration'] = obj.data.ObjectLockConfiguration;
        }
        if (obj.data.OwnershipControls && obj.data.OwnershipControls.Rules) {
            var ownershipcontrolsrules = [];
            obj.data.OwnershipControls.Rules.forEach(occonfig => {
                ownershipcontrolsrules.push({
                    'ObjectOwnership': occonfig.ObjectOwnership
                });
            });
            reqParams.cfn['OwnershipControls'] = {
                'Rules': ownershipcontrolsrules
            };
        }

        if (obj.data.PublicAccessBlockConfiguration) {
            reqParams.cfn['PublicAccessBlockConfiguration'] = {
                'BlockPublicAcls': obj.data.PublicAccessBlockConfiguration.BlockPublicAcls,
                'BlockPublicPolicy': obj.data.PublicAccessBlockConfiguration.BlockPublicPolicy,
                'IgnorePublicAcls': obj.data.PublicAccessBlockConfiguration.IgnorePublicAcls,
                'RestrictPublicBuckets': obj.data.PublicAccessBlockConfiguration.RestrictPublicBuckets
            };
        }
        if (obj.data.Tags) {
            reqParams.cfn['Tags'] = obj.data.Tags;
        }

        // The Terraform AWS provider (v4+) no longer accepts the bucket
        // configuration inline on aws_s3_bucket; only bucket-level identity and
        // tags remain here. Everything else is emitted as a dedicated
        // aws_s3_bucket_* resource below (Terraform only - CloudFormation keeps
        // it inline on AWS::S3::Bucket).
        var s3tftags = stripAWSTags(obj.data.Tags);
        if (Array.isArray(s3tftags)) {
            var s3tagmap = {};
            s3tftags.forEach(tag => { s3tagmap[tag.Key] = tag.Value; });
            reqParams.tf['tags'] = s3tagmap;
        }

        tracked_resources.push({
            'obj': obj,
            'logicalId': s3LogicalId,
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::Bucket',
            'terraformType': 'aws_s3_bucket',
            'options': reqParams,
            'returnValues': {
                'Ref': obj.data.Name,
                'Import': {
                    'BucketName': obj.data.Name
                },
                'Terraform': {
                    'id': obj.data.Name,
                    'arn': 'arn:aws:s3:::' + obj.data.Name
                }
            }
        });

        var s3TagsToMap = function(tags) {
            if (!tags || !tags.length) { return undefined; }
            var m = {};
            tags.forEach(function(t) { m[t.Key] = t.Value; });
            return m;
        };
        var s3PushSub = function(suffix, terraformType, tf) {
            tf['bucket'] = obj.data.Name;
            tracked_resources.push({
                'obj': obj,
                'logicalId': s3LogicalId + suffix,
                'region': obj.region,
                'service': 's3',
                'terraformType': terraformType,
                'options': { 'boto3': {}, 'go': {}, 'cfn': {}, 'cli': {}, 'tf': tf, 'iam': {} }
                // No returnValues: every aws_s3_bucket_* satellite here shares the
                // parent bucket's name as its Terraform id. Advertising that made
                // the bucket's own `bucket = "<name>"` resolve to a satellite and
                // the satellite's `bucket` resolve back to the bucket - a
                // dependency cycle that `tofu validate` rejects. Nothing needs to
                // reference these satellites; the one-way bucket dependency comes
                // from the parent aws_s3_bucket's returnValues instead.
            });
        };

        if (obj.data.Versioning && obj.data.Versioning.Status) {
            s3PushSub('Versioning', 'aws_s3_bucket_versioning', {
                'versioning_configuration': {
                    'status': obj.data.Versioning.Status,
                    'mfa_delete': obj.data.Versioning.MFADelete
                }
            });
        }

        if (obj.data.AccelerateConfiguration && obj.data.AccelerateConfiguration.Status) {
            s3PushSub('Accelerate', 'aws_s3_bucket_accelerate_configuration', {
                'status': obj.data.AccelerateConfiguration.Status
            });
        }

        if (obj.data.Encryption && obj.data.Encryption.ServerSideEncryptionConfiguration && obj.data.Encryption.ServerSideEncryptionConfiguration.Rules && obj.data.Encryption.ServerSideEncryptionConfiguration.Rules.length) {
            s3PushSub('Encryption', 'aws_s3_bucket_server_side_encryption_configuration', {
                'rule': obj.data.Encryption.ServerSideEncryptionConfiguration.Rules.map(rule => ({
                    'bucket_key_enabled': rule.BucketKeyEnabled,
                    'apply_server_side_encryption_by_default': rule.ApplyServerSideEncryptionByDefault ? {
                        'sse_algorithm': rule.ApplyServerSideEncryptionByDefault.SSEAlgorithm,
                        'kms_master_key_id': rule.ApplyServerSideEncryptionByDefault.KMSMasterKeyID
                    } : undefined
                }))
            });
        }

        if (obj.data.Cors && obj.data.Cors.CORSRules && obj.data.Cors.CORSRules.length) {
            s3PushSub('Cors', 'aws_s3_bucket_cors_configuration', {
                'cors_rule': obj.data.Cors.CORSRules.map(corsrule => ({
                    'id': corsrule.ID,
                    'allowed_headers': corsrule.AllowedHeaders,
                    'allowed_methods': corsrule.AllowedMethods,
                    'allowed_origins': corsrule.AllowedOrigins,
                    'expose_headers': corsrule.ExposeHeaders,
                    'max_age_seconds': corsrule.MaxAgeSeconds
                }))
            });
        }

        if (obj.data.Logging && obj.data.Logging.LoggingEnabled) {
            s3PushSub('Logging', 'aws_s3_bucket_logging', {
                'target_bucket': obj.data.Logging.LoggingEnabled.TargetBucket,
                'target_prefix': obj.data.Logging.LoggingEnabled.TargetPrefix
            });
        }

        if (obj.data.Website && (obj.data.Website.IndexDocument || obj.data.Website.RedirectAllRequestsTo)) {
            var websitetf = {};
            if (obj.data.Website.IndexDocument) {
                websitetf['index_document'] = { 'suffix': obj.data.Website.IndexDocument.Suffix };
            }
            if (obj.data.Website.ErrorDocument) {
                websitetf['error_document'] = { 'key': obj.data.Website.ErrorDocument.Key };
            }
            if (obj.data.Website.RedirectAllRequestsTo) {
                websitetf['redirect_all_requests_to'] = {
                    'host_name': obj.data.Website.RedirectAllRequestsTo.HostName,
                    'protocol': obj.data.Website.RedirectAllRequestsTo.Protocol
                };
            }
            if (obj.data.Website.RoutingRules && obj.data.Website.RoutingRules.length) {
                websitetf['routing_rule'] = obj.data.Website.RoutingRules.map(rr => ({
                    'condition': rr.Condition ? {
                        'key_prefix_equals': rr.Condition.KeyPrefixEquals,
                        'http_error_code_returned_equals': rr.Condition.HttpErrorCodeReturnedEquals
                    } : undefined,
                    'redirect': rr.Redirect ? {
                        'host_name': rr.Redirect.HostName,
                        'http_redirect_code': rr.Redirect.HttpRedirectCode,
                        'protocol': rr.Redirect.Protocol,
                        'replace_key_prefix_with': rr.Redirect.ReplaceKeyPrefixWith,
                        'replace_key_with': rr.Redirect.ReplaceKeyWith
                    } : undefined
                }));
            }
            s3PushSub('Website', 'aws_s3_bucket_website_configuration', websitetf);
        }

        if (obj.data.OwnershipControls && obj.data.OwnershipControls.Rules && obj.data.OwnershipControls.Rules.length) {
            s3PushSub('OwnershipControls', 'aws_s3_bucket_ownership_controls', {
                'rule': {
                    'object_ownership': obj.data.OwnershipControls.Rules[0].ObjectOwnership
                }
            });
        }

        if (obj.data.PublicAccessBlockConfiguration) {
            s3PushSub('PublicAccessBlock', 'aws_s3_bucket_public_access_block', {
                'block_public_acls': obj.data.PublicAccessBlockConfiguration.BlockPublicAcls,
                'block_public_policy': obj.data.PublicAccessBlockConfiguration.BlockPublicPolicy,
                'ignore_public_acls': obj.data.PublicAccessBlockConfiguration.IgnorePublicAcls,
                'restrict_public_buckets': obj.data.PublicAccessBlockConfiguration.RestrictPublicBuckets
            });
        }

        if (obj.data.ObjectLockConfiguration && obj.data.ObjectLockConfiguration.ObjectLockEnabled) {
            var olc = obj.data.ObjectLockConfiguration;
            s3PushSub('ObjectLock', 'aws_s3_bucket_object_lock_configuration', {
                'rule': (olc.Rule && olc.Rule.DefaultRetention) ? {
                    'default_retention': {
                        'mode': olc.Rule.DefaultRetention.Mode,
                        'days': olc.Rule.DefaultRetention.Days,
                        'years': olc.Rule.DefaultRetention.Years
                    }
                } : undefined
            });
        }

        if (obj.data.Lifecycle && obj.data.Lifecycle.Rules && obj.data.Lifecycle.Rules.length) {
            s3PushSub('Lifecycle', 'aws_s3_bucket_lifecycle_configuration', {
                'rule': obj.data.Lifecycle.Rules.map(rule => {
                    var tfrule = {
                        'id': rule.ID,
                        'status': rule.Status
                    };
                    // Always emit a filter block (required by the provider for
                    // v4+; an empty filter {} applies the rule to all objects).
                    var f = (rule.Filter && rule.Filter.And) ? rule.Filter.And : (rule.Filter || {});
                    tfrule['filter'] = {
                        'prefix': f.Prefix,
                        'object_size_greater_than': f.ObjectSizeGreaterThan,
                        'object_size_less_than': f.ObjectSizeLessThan,
                        'tag': (f.Tag && !(rule.Filter && rule.Filter.And)) ? { 'key': f.Tag.Key, 'value': f.Tag.Value } : undefined,
                        'tags': s3TagsToMap(f.Tags)
                    };
                    if (rule.Expiration) {
                        tfrule['expiration'] = {
                            'date': rule.Expiration.Date ? rule.Expiration.Date.toISOString() : undefined,
                            'days': rule.Expiration.Days,
                            'expired_object_delete_marker': rule.Expiration.ExpiredObjectDeleteMarker
                        };
                    }
                    if (rule.Transitions) {
                        tfrule['transition'] = rule.Transitions.map(t => ({
                            'date': t.Date ? t.Date.toISOString() : undefined,
                            'days': t.Days,
                            'storage_class': t.StorageClass
                        }));
                    }
                    if (rule.NoncurrentVersionExpiration) {
                        tfrule['noncurrent_version_expiration'] = {
                            'noncurrent_days': rule.NoncurrentVersionExpiration.NoncurrentDays,
                            'newer_noncurrent_versions': rule.NoncurrentVersionExpiration.NewerNoncurrentVersions
                        };
                    }
                    if (rule.NoncurrentVersionTransitions) {
                        tfrule['noncurrent_version_transition'] = rule.NoncurrentVersionTransitions.map(t => ({
                            'noncurrent_days': t.NoncurrentDays,
                            'newer_noncurrent_versions': t.NewerNoncurrentVersions,
                            'storage_class': t.StorageClass
                        }));
                    }
                    if (rule.AbortIncompleteMultipartUpload) {
                        tfrule['abort_incomplete_multipart_upload'] = {
                            'days_after_initiation': rule.AbortIncompleteMultipartUpload.DaysAfterInitiation
                        };
                    }
                    return tfrule;
                })
            });
        }

        if (obj.data.Replication && obj.data.Replication.ReplicationConfiguration && obj.data.Replication.ReplicationConfiguration.Rules && obj.data.Replication.ReplicationConfiguration.Rules.length) {
            var repl = obj.data.Replication.ReplicationConfiguration;
            s3PushSub('Replication', 'aws_s3_bucket_replication_configuration', {
                'role': repl.Role,
                'rule': (repl.Rules || []).map(rule => ({
                    'id': rule.ID,
                    'priority': rule.Priority,
                    'prefix': rule.Prefix,
                    'status': rule.Status,
                    'delete_marker_replication': rule.DeleteMarkerReplication ? {
                        'status': rule.DeleteMarkerReplication.Status
                    } : undefined,
                    'filter': rule.Filter ? {
                        'prefix': rule.Filter.Prefix,
                        'tag': rule.Filter.Tag ? { 'key': rule.Filter.Tag.Key, 'value': rule.Filter.Tag.Value } : undefined
                    } : undefined,
                    'source_selection_criteria': rule.SourceSelectionCriteria ? {
                        'sse_kms_encrypted_objects': rule.SourceSelectionCriteria.SseKmsEncryptedObjects ? {
                            'status': rule.SourceSelectionCriteria.SseKmsEncryptedObjects.Status
                        } : undefined
                    } : undefined,
                    'destination': rule.Destination ? {
                        'bucket': rule.Destination.Bucket,
                        'storage_class': rule.Destination.StorageClass,
                        'account': rule.Destination.Account,
                        'replica_kms_key_id': (rule.Destination.EncryptionConfiguration || {}).ReplicaKmsKeyID,
                        'access_control_translation': rule.Destination.AccessControlTranslation ? {
                            'owner': rule.Destination.AccessControlTranslation.Owner
                        } : undefined,
                        'metrics': rule.Destination.Metrics ? {
                            'status': rule.Destination.Metrics.Status,
                            'event_threshold': rule.Destination.Metrics.EventThreshold ? {
                                'minutes': rule.Destination.Metrics.EventThreshold.Minutes
                            } : undefined
                        } : undefined,
                        'replication_time': rule.Destination.ReplicationTime ? {
                            'status': rule.Destination.ReplicationTime.Status,
                            'time': rule.Destination.ReplicationTime.Time ? {
                                'minutes': rule.Destination.ReplicationTime.Time.Minutes
                            } : undefined
                        } : undefined
                    } : undefined
                }))
            });
        }

        if (obj.data.NotificationConfiguration && (obj.data.NotificationConfiguration.TopicConfigurations || obj.data.NotificationConfiguration.QueueConfigurations || obj.data.NotificationConfiguration.LambdaFunctionConfigurations)) {
            var s3NotifFilter = function(configuration) {
                var out = {};
                if (configuration.Filter && configuration.Filter.Key && configuration.Filter.Key.FilterRules) {
                    configuration.Filter.Key.FilterRules.forEach(function(fr) {
                        if (fr.Name && fr.Name.toLowerCase() == "prefix") { out.filter_prefix = fr.Value; }
                        if (fr.Name && fr.Name.toLowerCase() == "suffix") { out.filter_suffix = fr.Value; }
                    });
                }
                return out;
            };
            var notiftf = {};
            if (obj.data.NotificationConfiguration.TopicConfigurations && obj.data.NotificationConfiguration.TopicConfigurations.length) {
                notiftf['topic'] = obj.data.NotificationConfiguration.TopicConfigurations.map(c => Object.assign({
                    'id': c.Id,
                    'topic_arn': c.TopicArn,
                    'events': c.Events
                }, s3NotifFilter(c)));
            }
            if (obj.data.NotificationConfiguration.QueueConfigurations && obj.data.NotificationConfiguration.QueueConfigurations.length) {
                notiftf['queue'] = obj.data.NotificationConfiguration.QueueConfigurations.map(c => Object.assign({
                    'id': c.Id,
                    'queue_arn': c.QueueArn,
                    'events': c.Events
                }, s3NotifFilter(c)));
            }
            if (obj.data.NotificationConfiguration.LambdaFunctionConfigurations && obj.data.NotificationConfiguration.LambdaFunctionConfigurations.length) {
                notiftf['lambda_function'] = obj.data.NotificationConfiguration.LambdaFunctionConfigurations.map(c => Object.assign({
                    'id': c.Id,
                    'lambda_function_arn': c.LambdaFunctionArn,
                    'events': c.Events
                }, s3NotifFilter(c)));
            }
            s3PushSub('Notification', 'aws_s3_bucket_notification', notiftf);
        }

        if (obj.data.AnalyticsConfigurations && obj.data.AnalyticsConfigurations.AnalyticsConfigurationList) {
            obj.data.AnalyticsConfigurations.AnalyticsConfigurationList.forEach(function(config, idx) {
                var sca = null;
                if (config.StorageClassAnalysis && config.StorageClassAnalysis.DataExport) {
                    var dest = config.StorageClassAnalysis.DataExport.Destination.S3BucketDestination;
                    sca = {
                        'data_export': {
                            'output_schema_version': config.StorageClassAnalysis.DataExport.OutputSchemaVersion,
                            'destination': {
                                's3_bucket_destination': {
                                    'bucket_arn': dest.Bucket,
                                    'bucket_account_id': dest.BucketAccountId,
                                    'format': dest.Format,
                                    'prefix': dest.Prefix
                                }
                            }
                        }
                    };
                }
                var filt = undefined;
                if (config.Filter) {
                    var ftags = config.Filter.Tag ? [config.Filter.Tag] : [];
                    if (config.Filter.And && config.Filter.And.Tags) { ftags = ftags.concat(config.Filter.And.Tags); }
                    filt = {
                        'prefix': config.Filter.Prefix || (config.Filter.And ? config.Filter.And.Prefix : undefined),
                        'tags': s3TagsToMap(ftags)
                    };
                }
                s3PushSub('Analytics' + idx, 'aws_s3_bucket_analytics_configuration', {
                    'name': config.Id,
                    'filter': filt,
                    'storage_class_analysis': sca
                });
            });
        }

        if (obj.data.InventoryConfigurations && obj.data.InventoryConfigurations.InventoryConfigurationList) {
            obj.data.InventoryConfigurations.InventoryConfigurationList.forEach(function(config, idx) {
                var dest = config.Destination.S3BucketDestination;
                s3PushSub('Inventory' + idx, 'aws_s3_bucket_inventory', {
                    'name': config.Id,
                    'enabled': config.IsEnabled,
                    'included_object_versions': config.IncludedObjectVersions,
                    'optional_fields': config.OptionalFields,
                    'schedule': { 'frequency': config.Schedule.Frequency },
                    'filter': (config.Filter && config.Filter.Prefix) ? { 'prefix': config.Filter.Prefix } : undefined,
                    'destination': {
                        'bucket': {
                            'bucket_arn': dest.Bucket,
                            'account_id': dest.AccountId,
                            'format': dest.Format,
                            'prefix': dest.Prefix,
                            'encryption': dest.Encryption ? {
                                'sse_s3': dest.Encryption.SSES3 ? {} : undefined,
                                'sse_kms': dest.Encryption.SSEKMS ? { 'key_id': dest.Encryption.SSEKMS.KeyId } : undefined
                            } : undefined
                        }
                    }
                });
            });
        }

        if (obj.data.MetricsConfigurations && obj.data.MetricsConfigurations.MetricsConfigurationList) {
            obj.data.MetricsConfigurations.MetricsConfigurationList.forEach(function(config, idx) {
                var filt = undefined;
                if (config.Filter) {
                    var ftags = config.Filter.Tag ? [config.Filter.Tag] : [];
                    if (config.Filter.And && config.Filter.And.Tags) { ftags = ftags.concat(config.Filter.And.Tags); }
                    filt = {
                        'prefix': config.Filter.Prefix || (config.Filter.And ? config.Filter.And.Prefix : undefined),
                        'tags': s3TagsToMap(ftags)
                    };
                }
                s3PushSub('Metric' + idx, 'aws_s3_bucket_metric', {
                    'name': config.Id,
                    'filter': filt
                });
            });
        }

        if (obj.data.IntelligentTieringConfiguration) {
            obj.data.IntelligentTieringConfiguration.forEach(function(itconfig, idx) {
                var filt = undefined;
                if (itconfig.Filter) {
                    var ftags = itconfig.Filter.Tag ? [itconfig.Filter.Tag] : [];
                    if (itconfig.Filter.And && itconfig.Filter.And.Tags) { ftags = ftags.concat(itconfig.Filter.And.Tags); }
                    filt = {
                        'prefix': itconfig.Filter.Prefix || (itconfig.Filter.And ? itconfig.Filter.And.Prefix : undefined),
                        'tags': s3TagsToMap(ftags)
                    };
                }
                s3PushSub('IntelligentTiering' + idx, 'aws_s3_bucket_intelligent_tiering_configuration', {
                    'name': itconfig.Id,
                    'status': itconfig.Status,
                    'filter': filt,
                    'tiering': (itconfig.Tierings || []).map(t => ({
                        'access_tier': t.AccessTier,
                        'days': t.Days
                    }))
                });
            });
        }
    } else if (obj.type == "s3.bucketpolicy") {
        reqParams.cfn['Bucket'] = obj.data.Bucket;
        reqParams.tf['bucket'] = obj.data.Bucket;
        reqParams.cfn['PolicyDocument'] = JSON.parse(obj.data.Policy);
        reqParams.tf['policy'] = obj.data.Policy;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::BucketPolicy'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::BucketPolicy',
            'terraformType': 'aws_s3_bucket_policy',
            'options': reqParams
        });
    } else if (obj.type == "s3.accountpublicaccessblock") {
        var pabc = obj.data.PublicAccessBlockConfiguration || {};
        reqParams.tf['block_public_acls'] = pabc.BlockPublicAcls;
        reqParams.tf['block_public_policy'] = pabc.BlockPublicPolicy;
        reqParams.tf['ignore_public_acls'] = pabc.IgnorePublicAcls;
        reqParams.tf['restrict_public_buckets'] = pabc.RestrictPublicBuckets;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::AccountPublicAccessBlock'),
            'region': obj.region,
            'service': 's3',
            'terraformType': 'aws_s3_account_public_access_block',
            'options': reqParams,
            'returnValues': {
                'Terraform': {
                    'id': obj.data.AccountId
                }
            }
        });
    } else if (obj.type == "s3.accesspoint") {
        reqParams.cfn['Name'] = obj.data.Name;
        reqParams.cfn['Bucket'] = obj.data.Bucket;
        reqParams.cfn['Policy'] = obj.data.Policy;
        reqParams.cfn['AccountId'] = obj.data.AccountId;
        reqParams.cfn['VpcConfiguration'] = obj.data.VpcConfiguration;
        reqParams.cfn['PublicAccessBlockConfiguration'] = obj.data.PublicAccessBlockConfiguration;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::AccessPoint'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::AccessPoint',
            'options': reqParams,
            'returnValues': {
                'Ref': obj.data.Name,
                'Import': {
                    'Name': obj.data.Name
                }
            }
        });
    } else if (obj.type == "s3.storagelens") {
        var dataexport = null;
        if (obj.data.StorageLensConfiguration.DataExport && obj.data.StorageLensConfiguration.DataExport.S3BucketDestination) {
            dataexport = {
                'S3BucketDestination': {
                    'AccountId': obj.data.StorageLensConfiguration.DataExport.S3BucketDestination.AccountId,
                    'Encryption': obj.data.StorageLensConfiguration.DataExport.S3BucketDestination.Encryption,
                    'Format': obj.data.StorageLensConfiguration.DataExport.S3BucketDestination.Format,
                    'OutputSchemaVersion': obj.data.StorageLensConfiguration.DataExport.S3BucketDestination.OutputSchemaVersion,
                    'Prefix': obj.data.StorageLensConfiguration.DataExport.S3BucketDestination.Prefix
                }
            };
        }
        reqParams.cfn['StorageLensConfiguration'] = {
            'AccountLevel': obj.data.StorageLensConfiguration.AccountLevel,
            'DataExport': dataexport,
            'Id': obj.data.StorageLensConfiguration.Id,
            'Exclude': obj.data.StorageLensConfiguration.Exclude,
            'Include': obj.data.StorageLensConfiguration.Include,
            'IsEnabled': obj.data.StorageLensConfiguration.IsEnabled
        };

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::StorageLens'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::StorageLens',
            'options': reqParams
        });
    } else if (obj.type == "s3.outpostbucket") {
        reqParams.cfn['BucketName'] = obj.data.Bucket;
        reqParams.cfn['OutpostId'] = obj.data.OutpostId;
        reqParams.cfn['LifecycleConfiguration'] = obj.data.LifecycleConfiguration;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3Outposts::Bucket'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3Outposts::Bucket',
            'options': reqParams
        });
    } else if (obj.type == "s3.outpostbucketpolicy") {
        reqParams.cfn['Bucket'] = obj.data.Bucket;
        reqParams.cfn['PolicyDocument'] = JSON.parse(obj.data.Policy);

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3Outposts::BucketPolicy'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3Outposts::BucketPolicy',
            'options': reqParams
        });
    } else if (obj.type == "s3.outpostaccesspoint") {
        reqParams.cfn['Name'] = obj.data.Name;
        reqParams.cfn['Bucket'] = obj.data.Bucket;
        if (obj.data.Policy) {
            reqParams.cfn['Policy'] = JSON.parse(obj.data.Policy);
        }
        reqParams.cfn['VpcConfiguration'] = obj.data.VpcConfiguration;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3Outposts::AccessPoint'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3Outposts::AccessPoint',
            'options': reqParams
        });
    } else if (obj.type == "s3.outpostendpoint") {
        reqParams.cfn['OutpostId'] = obj.data.OutpostsId;
        reqParams.cfn['SecurityGroupId'] = obj.data.SecurityGroupId;
        reqParams.cfn['SubnetId'] = obj.data.SubnetId;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3Outposts::Endpoint'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3Outposts::Endpoint',
            'options': reqParams
        });
    } else if (obj.type == "s3.objectlambdaaccesspoint") {
        reqParams.cfn['Name'] = obj.data.Name;
        reqParams.cfn['ObjectLambdaConfiguration'] = obj.data.Configuration;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3ObjectLambda::AccessPoint'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3ObjectLambda::AccessPoint',
            'options': reqParams,
            'returnValues': {
                'GetAtt': {
                    'Arn': obj.data.Arn
                }
            }
        });
    } else if (obj.type == "s3.objectlambdaaccesspointpolicy") {
        reqParams.cfn['ObjectLambdaAccessPoint'] = obj.data.ObjectLambdaAccessPoint;
        reqParams.cfn['PolicyDocument'] = obj.data.Policy;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3ObjectLambda::AccessPointPolicy'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3ObjectLambda::AccessPointPolicy',
            'options': reqParams
        });
    } else if (obj.type == "s3.multiregionaccesspoint") {
        reqParams.cfn['Name'] = obj.data.Name;
        if (obj.data.Regions) {
            reqParams.cfn['Regions'] = [];
            obj.data.Regions.forEach(region => {
                reqParams.cfn['Regions'].push({
                    'Bucket': region.Bucket
                });
            });
        }
        reqParams.cfn['PublicAccessBlockConfiguration'] = obj.data.PublicAccessBlockConfiguration;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::MultiRegionAccessPoint'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::MultiRegionAccessPoint',
            'options': reqParams,
            'returnValues': {
                'Ref': obj.data.Name,
                'GetAtt': {
                    'Alias': obj.data.Alias
                }
            }
        });
    } else if (obj.type == "s3.multiregionaccesspointpolicy") {
        reqParams.cfn['MrapName'] = obj.data.Name;
        reqParams.cfn['Policy'] = obj.data.Policy.Established.Policy;

        tracked_resources.push({
            'obj': obj,
            'logicalId': getResourceName('s3', obj.id, 'AWS::S3::MultiRegionAccessPointPolicy'),
            'region': obj.region,
            'service': 's3',
            'type': 'AWS::S3::MultiRegionAccessPointPolicy',
            'options': reqParams
        });
    } else {
        return false;
    }

    return true;
});
