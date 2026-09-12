import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';

import { useAuth } from '../contexts/AuthContext';

import api from '../services/api';

import {
  formatKm,
} from '../utils/formatters';


interface Vehicle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  renavam: string;
  chassis: string;
  current_km: number;
  status: string;
}


interface VehicleForm {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  renavam: string;
  chassis: string;
  current_km: string;
  status: 'ACTIVE' | 'INACTIVE';
}


const EMPTY_FORM: VehicleForm = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  renavam: '',
  chassis: '',
  current_km: '',
  status: 'ACTIVE',
};


export default function VehiclesScreen() {
  const { user } = useAuth();


  const [
    vehicles,
    setVehicles,
  ] = useState<Vehicle[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  /*
   * ============================================================
   * FORMULÁRIO
   * ============================================================
   */

  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    form,
    setForm,
  ] = useState<VehicleForm>(
    EMPTY_FORM,
  );


  /*
   * Quando null:
   * estamos cadastrando.
   *
   * Quando possui veículo:
   * estamos editando.
   */
  const [
    editingVehicle,
    setEditingVehicle,
  ] = useState<Vehicle | null>(
    null,
  );


  /*
   * ============================================================
   * PERMISSÕES
   * ============================================================
   */

  const roleName =
    user?.role?.name ?? '';


  /*
   * Administrador e Gestor podem
   * cadastrar.
   *
   * O backend continuará sendo a
   * autoridade definitiva.
   */
  const canCreateVehicle =
    useMemo(
      () =>
        roleName === 'Administrador' ||
        roleName === 'Gestor' ||
        user?.is_superuser === true,
      [
        roleName,
        user?.is_superuser,
      ],
    );


  /*
   * Editar/excluir:
   * somente Administrador
   * ou superuser.
   */
  const canManageVehicle =
    useMemo(
      () =>
        roleName === 'Administrador' ||
        user?.is_superuser === true,
      [
        roleName,
        user?.is_superuser,
      ],
    );


  /*
   * ============================================================
   * CARREGAR FROTA
   * ============================================================
   */

  const loadVehicles =
    useCallback(
      async () => {
        try {
          setError(
            null,
          );


          const response =
            await api.get<Vehicle[]>(
              '/vehicles/',
            );


          setVehicles(
            response.data,
          );

        } catch (err: any) {
          console.error(
            'Erro ao carregar veículos:',
            err?.response?.data ??
              err?.message ??
              err,
          );


          setError(
            'Não foi possível carregar os veículos.',
          );

        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
    loadVehicles();
  }, [
    loadVehicles,
  ]);


  /*
   * ============================================================
   * FORMULÁRIO
   * ============================================================
   */

  const updateForm =
    useCallback(
      (
        field: keyof VehicleForm,
        value: string,
      ) => {
        setForm(
          (current) => ({
            ...current,
            [field]: value,
          }),
        );
      },
      [],
    );


  const openCreateModal =
    useCallback(
      () => {
        setEditingVehicle(
          null,
        );

        setForm(
          EMPTY_FORM,
        );

        setModalVisible(
          true,
        );
      },
      [],
    );


  const openEditModal =
    useCallback(
      (
        vehicle: Vehicle,
      ) => {
        if (!canManageVehicle) {
          return;
        }


        setEditingVehicle(
          vehicle,
        );


        setForm({
          plate:
            vehicle.plate ?? '',

          brand:
            vehicle.brand ?? '',

          model:
            vehicle.model ?? '',

          year:
            String(
              vehicle.year ?? '',
            ),

          color:
            vehicle.color ?? '',

          renavam:
            vehicle.renavam ?? '',

          chassis:
            vehicle.chassis ?? '',

          current_km:
            String(
              vehicle.current_km ?? 0,
            ),

          status:
            vehicle.status === 'INACTIVE'
              ? 'INACTIVE'
              : 'ACTIVE',
        });


        setModalVisible(
          true,
        );
      },
      [
        canManageVehicle,
      ],
    );


  const closeModal =
    useCallback(
      () => {
        if (saving) {
          return;
        }


        setModalVisible(
          false,
        );


        setEditingVehicle(
          null,
        );


        setForm(
          EMPTY_FORM,
        );
      },
      [
        saving,
      ],
    );


  /*
   * ============================================================
   * VALIDAÇÃO
   * ============================================================
   */

  const validateForm =
    useCallback(
      () => {
        const plate =
          form.plate
            .trim()
            .toUpperCase();


        const brand =
          form.brand.trim();


        const model =
          form.model.trim();


        const year =
          Number(
            form.year,
          );


        const currentKm =
          Number(
            form.current_km,
          );


        if (!plate) {
          Alert.alert(
            'Placa',
            'Informe a placa do veículo.',
          );

          return false;
        }


        if (!brand) {
          Alert.alert(
            'Marca',
            'Informe a marca do veículo.',
          );

          return false;
        }


        if (!model) {
          Alert.alert(
            'Modelo',
            'Informe o modelo do veículo.',
          );

          return false;
        }


        if (
          !Number.isInteger(
            year,
          ) ||
          year < 1900 ||
          year > 2100
        ) {
          Alert.alert(
            'Ano inválido',
            'Informe um ano válido.',
          );

          return false;
        }


        if (
          !Number.isFinite(
            currentKm,
          ) ||
          currentKm < 0
        ) {
          Alert.alert(
            'Quilometragem inválida',
            'Informe uma quilometragem válida.',
          );

          return false;
        }


        return true;
      },
      [
        form,
      ],
    );


  /*
   * ============================================================
   * PAYLOAD
   * ============================================================
   */

  const buildPayload =
    useCallback(
      () => ({
        plate:
          form.plate
            .trim()
            .toUpperCase(),

        brand:
          form.brand.trim(),

        model:
          form.model.trim(),

        year:
          Number(
            form.year,
          ),

        color:
          form.color.trim(),

        renavam:
          form.renavam.trim(),

        chassis:
          form.chassis
            .trim()
            .toUpperCase(),

        current_km:
          Number(
            form.current_km,
          ),

        status:
          form.status,
      }),
      [
        form,
      ],
    );


  /*
   * ============================================================
   * ERROS DO BACKEND
   * ============================================================
   */

  const showBackendError =
    useCallback(
      (
        err: any,
        fallbackMessage: string,
      ) => {
        const data =
          err?.response?.data;


        if (!data) {
          Alert.alert(
            'Erro',
            fallbackMessage,
          );

          return;
        }


        if (
          typeof data === 'string'
        ) {
          Alert.alert(
            'Erro',
            data,
          );

          return;
        }


        if (data.detail) {
          Alert.alert(
            'Erro',
            String(
              data.detail,
            ),
          );

          return;
        }


        const firstField =
          Object.keys(
            data,
          )[0];


        if (firstField) {
          const value =
            data[
              firstField
            ];


          Alert.alert(
            'Não foi possível concluir',
            Array.isArray(
              value,
            )
              ? value.join(
                  '\n',
                )
              : String(
                  value,
                ),
          );

          return;
        }


        Alert.alert(
          'Erro',
          fallbackMessage,
        );
      },
      [],
    );


  /*
   * ============================================================
   * SALVAR
   * ============================================================
   */

  const saveVehicle =
    useCallback(
      async () => {
        const editing =
          editingVehicle !== null;


        if (
          editing &&
          !canManageVehicle
        ) {
          Alert.alert(
            'Acesso negado',
            'Somente administradores podem editar veículos.',
          );

          return;
        }


        if (
          !editing &&
          !canCreateVehicle
        ) {
          Alert.alert(
            'Acesso negado',
            'Seu usuário não possui permissão para cadastrar veículos.',
          );

          return;
        }


        if (
          !validateForm()
        ) {
          return;
        }


        const payload =
          buildPayload();


        try {
          setSaving(
            true,
          );


          if (
            editingVehicle
          ) {
            await api.patch(
              `/vehicles/${editingVehicle.id}/`,
              payload,
            );

          } else {
            await api.post(
              '/vehicles/',
              payload,
            );
          }


          setModalVisible(
            false,
          );


          setEditingVehicle(
            null,
          );


          setForm(
            EMPTY_FORM,
          );


          await loadVehicles();


          Alert.alert(
            editing
              ? 'Veículo atualizado'
              : 'Veículo cadastrado',

            editing
              ? 'Os dados do veículo foram atualizados.'
              : 'O veículo foi cadastrado com sucesso.',
          );

        } catch (err: any) {
          console.error(
            editingVehicle
              ? 'Erro ao editar veículo:'
              : 'Erro ao cadastrar veículo:',
            err?.response?.data ??
              err?.message ??
              err,
          );


          showBackendError(
            err,
            editingVehicle
              ? 'Não foi possível atualizar o veículo.'
              : 'Não foi possível cadastrar o veículo.',
          );

        } finally {
          setSaving(
            false,
          );
        }
      },
      [
        buildPayload,
        canCreateVehicle,
        canManageVehicle,
        editingVehicle,
        loadVehicles,
        showBackendError,
        validateForm,
      ],
    );


  /*
   * ============================================================
   * EXCLUIR
   * ============================================================
   */

  const deleteVehicle =
    useCallback(
      (
        vehicle: Vehicle,
      ) => {
        if (
          !canManageVehicle
        ) {
          Alert.alert(
            'Acesso negado',
            'Somente administradores podem excluir veículos.',
          );

          return;
        }


        Alert.alert(
          'Excluir veículo',
          (
            `Deseja realmente excluir ` +
            `${vehicle.plate} — ` +
            `${vehicle.brand} ${vehicle.model}?`
          ),
          [
            {
              text:
                'Cancelar',

              style:
                'cancel',
            },

            {
              text:
                'Excluir',

              style:
                'destructive',

              onPress:
                async () => {
                  try {
                    await api.delete(
                      `/vehicles/${vehicle.id}/`,
                    );


                    await loadVehicles();


                    Alert.alert(
                      'Veículo excluído',
                      'O veículo foi removido da frota.',
                    );

                  } catch (
                    err: any
                  ) {
                    console.error(
                      'Erro ao excluir veículo:',
                      err?.response?.data ??
                        err?.message ??
                        err,
                    );


                    showBackendError(
                      err,
                      (
                        'Não foi possível excluir o veículo. ' +
                        'Ele pode estar vinculado a viagens existentes.'
                      ),
                    );
                  }
                },
            },
          ],
        );
      },
      [
        canManageVehicle,
        loadVehicles,
        showBackendError,
      ],
    );


  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Carregando veículos...
        </Text>
      </SafeAreaView>
    );
  }


  /*
   * ============================================================
   * TELA
   * ============================================================
   */

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >

      <FlatList
        data={
          vehicles
        }
        keyExtractor={
          (item) =>
            item.id.toString()
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true,
              );

              loadVehicles();
            }}
          />
        }
        ListHeaderComponent={
          <>
            <ScreenHeader
              title="Veículos"
              subtitle="Frota disponível no AuditKM."
            />


            {canCreateVehicle && (
              <TouchableOpacity
                style={
                  styles.createButton
                }
                activeOpacity={
                  0.85
                }
                onPress={
                  openCreateModal
                }
              >
                <Text
                  style={
                    styles.createButtonIcon
                  }
                >
                  +
                </Text>

                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Cadastrar veículo
                </Text>
              </TouchableOpacity>
            )}


            {error && (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhum veículo"
            description={
              canCreateVehicle
                ? (
                    'Nenhum veículo foi cadastrado.'
                  )
                : (
                    'Não há veículos disponíveis para exibição.'
                  )
            }
          />
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.card
            }
          >

            <View
              style={
                styles.header
              }
            >

              <View
                style={
                  styles.vehicleTitleContainer
                }
              >
                <Text
                  style={
                    styles.plate
                  }
                >
                  {item.plate}
                </Text>

                <Text
                  style={
                    styles.vehicleName
                  }
                >
                  {item.brand}{' '}
                  {item.model}
                </Text>
              </View>


              <View
                style={[
                  styles.statusBadge,

                  item.status ===
                  'ACTIVE'
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    item.status ===
                    'ACTIVE'
                      ? styles.activeText
                      : styles.inactiveText,
                  ]}
                >
                  {
                    item.status ===
                    'ACTIVE'
                      ? 'Ativo'
                      : item.status ===
                        'INACTIVE'
                        ? 'Inativo'
                        : item.status
                  }
                </Text>
              </View>

            </View>


            <View
              style={
                styles.detailsRow
              }
            >

              <View
                style={
                  styles.detailItem
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Ano
                </Text>

                <Text
                  style={
                    styles.value
                  }
                >
                  {item.year}
                </Text>
              </View>


              <View
                style={
                  styles.detailItem
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  Cor
                </Text>

                <Text
                  style={
                    styles.value
                  }
                >
                  {
                    item.color ||
                    'Não informada'
                  }
                </Text>
              </View>


              <View
                style={
                  styles.detailItem
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  KM atual
                </Text>

                <Text
                  style={
                    styles.km
                  }
                >
                  {formatKm(
                    item.current_km,
                  )}
                </Text>
              </View>

            </View>


            {(item.renavam ||
              item.chassis) && (
              <View
                style={
                  styles.documentArea
                }
              >
                {!!item.renavam && (
                  <View
                    style={
                      styles.documentRow
                    }
                  >
                    <Text
                      style={
                        styles.documentLabel
                      }
                    >
                      RENAVAM
                    </Text>

                    <Text
                      style={
                        styles.documentValue
                      }
                    >
                      {item.renavam}
                    </Text>
                  </View>
                )}


                {!!item.chassis && (
                  <View
                    style={
                      styles.documentRow
                    }
                  >
                    <Text
                      style={
                        styles.documentLabel
                      }
                    >
                      Chassi
                    </Text>

                    <Text
                      style={
                        styles.documentValue
                      }
                    >
                      {item.chassis}
                    </Text>
                  </View>
                )}
              </View>
            )}


            {canManageVehicle && (
              <View
                style={
                  styles.managementActions
                }
              >

                <TouchableOpacity
                  style={
                    styles.editButton
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    openEditModal(
                      item,
                    )
                  }
                >
                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Editar
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    deleteVehicle(
                      item,
                    )
                  }
                >
                  <Text
                    style={
                      styles.deleteButtonText
                    }
                  >
                    Excluir
                  </Text>
                </TouchableOpacity>

              </View>
            )}

          </View>
        )}
      />


      <Modal
        visible={
          modalVisible
        }
        animationType="slide"
        transparent
        onRequestClose={
          closeModal
        }
      >

        <KeyboardAvoidingView
          style={
            styles.modalOverlay
          }
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >

          <Pressable
            style={
              styles.modalBackdrop
            }
            onPress={
              closeModal
            }
          />


          <View
            style={
              styles.modalContainer
            }
          >

            <View
              style={
                styles.modalHeader
              }
            >

              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {
                    editingVehicle
                      ? 'Editar veículo'
                      : 'Novo veículo'
                  }
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  {
                    editingVehicle
                      ? 'Atualize os dados da frota.'
                      : 'Cadastre um veículo na frota.'
                  }
                </Text>
              </View>


              <TouchableOpacity
                style={
                  styles.closeButton
                }
                onPress={
                  closeModal
                }
                disabled={
                  saving
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>
              </TouchableOpacity>

            </View>


            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.formContent
              }
              showsVerticalScrollIndicator={
                false
              }
            >

              <Text
                style={
                  styles.inputLabel
                }
              >
                Placa *
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  form.plate
                }
                onChangeText={
                  (value) =>
                    updateForm(
                      'plate',
                      value.toUpperCase(),
                    )
                }
                placeholder="ABC1D23"
                placeholderTextColor="#90A4AE"
                autoCapitalize="characters"
                maxLength={
                  8
                }
                editable={
                  !saving
                }
              />


             <Text
  style={
    styles.inputLabel
  }
>
  Marca *
</Text>

<TextInput
  style={
    styles.input
  }
  value={
    form.brand
  }
  onChangeText={
    (value) =>
      updateForm(
        'brand',
        value,
      )
  }
  placeholder="Ex.: Toyota"
  placeholderTextColor="#90A4AE"
  autoCapitalize="words"
  editable={
    !saving
  }
/>


              <Text
                style={
                  styles.inputLabel
                }
              >
                Modelo *
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  form.model
                }
                onChangeText={
                  (value) =>
                    updateForm(
                      'model',
                      value,
                    )
                }
                placeholder="Ex.: Hilux"
                placeholderTextColor="#90A4AE"
                editable={
                  !saving
                }
              />


              <View
                style={
                  styles.twoColumns
                }
              >

                <View
                  style={
                    styles.column
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Ano *
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      form.year
                    }
                    onChangeText={
                      (value) =>
                        updateForm(
                          'year',
                          value.replace(
                            /\D/g,
                            '',
                          ),
                        )
                    }
                    placeholder="2026"
                    placeholderTextColor="#90A4AE"
                    keyboardType="number-pad"
                    maxLength={
                      4
                    }
                    editable={
                      !saving
                    }
                  />
                </View>


                <View
                  style={
                    styles.column
                  }
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    Cor
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      form.color
                    }
                    onChangeText={
                      (value) =>
                        updateForm(
                          'color',
                          value,
                        )
                    }
                    placeholder="Branco"
                    placeholderTextColor="#90A4AE"
                    editable={
                      !saving
                    }
                  />
                </View>

              </View>


              <Text
                style={
                  styles.inputLabel
                }
              >
                RENAVAM
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  form.renavam
                }
                onChangeText={
                  (value) =>
                    updateForm(
                      'renavam',
                      value.replace(
                        /\D/g,
                        '',
                      ),
                    )
                }
                placeholder="Número do RENAVAM"
                placeholderTextColor="#90A4AE"
                keyboardType="number-pad"
                editable={
                  !saving
                }
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Chassi
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  form.chassis
                }
                onChangeText={
                  (value) =>
                    updateForm(
                      'chassis',
                      value.toUpperCase(),
                    )
                }
                placeholder="Número do chassi"
                placeholderTextColor="#90A4AE"
                autoCapitalize="characters"
                editable={
                  !saving
                }
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Quilometragem atual *
              </Text>

              <TextInput
                style={
                  styles.input
                }
                value={
                  form.current_km
                }
                onChangeText={
                  (value) =>
                    updateForm(
                      'current_km',
                      value.replace(
                        /\D/g,
                        '',
                      ),
                    )
                }
                placeholder="Ex.: 45200"
                placeholderTextColor="#90A4AE"
                keyboardType="number-pad"
                editable={
                  !saving
                }
              />


              <Text
                style={
                  styles.inputLabel
                }
              >
                Status
              </Text>


              <View
                style={
                  styles.statusSelector
                }
              >

                <TouchableOpacity
                  style={[
                    styles.statusOption,

                    form.status ===
                      'ACTIVE' &&
                      styles.statusOptionSelected,
                  ]}
                  onPress={() =>
                    updateForm(
                      'status',
                      'ACTIVE',
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  <Text
                    style={[
                      styles.statusOptionText,

                      form.status ===
                        'ACTIVE' &&
                        styles.statusOptionTextSelected,
                    ]}
                  >
                    Ativo
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[
                    styles.statusOption,

                    form.status ===
                      'INACTIVE' &&
                      styles.statusOptionSelected,
                  ]}
                  onPress={() =>
                    updateForm(
                      'status',
                      'INACTIVE',
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  <Text
                    style={[
                      styles.statusOptionText,

                      form.status ===
                        'INACTIVE' &&
                        styles.statusOptionTextSelected,
                    ]}
                  >
                    Inativo
                  </Text>
                </TouchableOpacity>

              </View>


              <TouchableOpacity
                style={[
                  styles.saveButton,

                  saving &&
                    styles.saveButtonDisabled,
                ]}
                activeOpacity={
                  0.85
                }
                onPress={
                  saveVehicle
                }
                disabled={
                  saving
                }
              >

                {saving ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                ) : (
                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {
                      editingVehicle
                        ? 'Salvar alterações'
                        : 'Cadastrar veículo'
                    }
                  </Text>
                )}

              </TouchableOpacity>


              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={
                  closeModal
                }
                disabled={
                  saving
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

            </ScrollView>

          </View>

        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F4F6F8',
    },

    content: {
      padding: 18,
      paddingBottom: 40,
      flexGrow: 1,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F4F6F8',
    },

    loadingText: {
      marginTop: 10,
      color: '#607D8B',
    },

    createButton: {
      backgroundColor: '#0D47A1',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    createButtonIcon: {
      color: '#FFFFFF',
      fontSize: 24,
      lineHeight: 24,
      marginRight: 8,
    },

    createButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: 'bold',
    },

    errorBox: {
      backgroundColor: '#FFEBEE',
      padding: 12,
      borderRadius: 9,
      marginBottom: 15,
    },

    errorText: {
      color: '#C62828',
    },

    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 17,
      marginBottom: 12,
    },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },

    vehicleTitleContainer: {
      flex: 1,
      paddingRight: 12,
    },

    plate: {
      fontSize: 19,
      fontWeight: 'bold',
      color: '#263238',
    },

    vehicleName: {
      marginTop: 4,
      color: '#607D8B',
    },

    statusBadge: {
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },

    activeBadge: {
      backgroundColor: '#E8F5E9',
    },

    inactiveBadge: {
      backgroundColor: '#ECEFF1',
    },

    statusText: {
      fontSize: 12,
      fontWeight: 'bold',
    },

    activeText: {
      color: '#2E7D32',
    },

    inactiveText: {
      color: '#607D8B',
    },

    detailsRow: {
      marginTop: 20,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#ECEFF1',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    detailItem: {
      flex: 1,
    },

    label: {
      color: '#90A4AE',
      fontSize: 11,
    },

    value: {
      marginTop: 3,
      color: '#455A64',
      fontWeight: '600',
    },

    km: {
      marginTop: 3,
      color: '#0D47A1',
      fontWeight: 'bold',
    },

    documentArea: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#ECEFF1',
    },

    documentRow: {
      marginBottom: 7,
    },

    documentLabel: {
      color: '#90A4AE',
      fontSize: 10,
      fontWeight: '600',
    },

    documentValue: {
      color: '#546E7A',
      marginTop: 2,
      fontSize: 12,
    },

    managementActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#ECEFF1',
    },

    editButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#0D47A1',
      borderRadius: 9,
      paddingVertical: 10,
      alignItems: 'center',
    },

    editButtonText: {
      color: '#0D47A1',
      fontWeight: 'bold',
    },

    deleteButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#C62828',
      borderRadius: 9,
      paddingVertical: 10,
      alignItems: 'center',
    },

    deleteButtonText: {
      color: '#C62828',
      fontWeight: 'bold',
    },

    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },

    modalBackdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      minHeight: '70%',
    },

    modalHeader: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#ECEFF1',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    modalTitle: {
      color: '#263238',
      fontSize: 21,
      fontWeight: 'bold',
    },

    modalSubtitle: {
      marginTop: 3,
      color: '#78909C',
      fontSize: 13,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#ECEFF1',
      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      color: '#546E7A',
      fontSize: 25,
      lineHeight: 27,
    },

    formContent: {
      padding: 20,
      paddingBottom: 40,
    },

    inputLabel: {
      color: '#455A64',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 7,
      marginTop: 5,
    },

    input: {
      borderWidth: 1,
      borderColor: '#CFD8DC',
      backgroundColor: '#FAFAFA',
      color: '#263238',
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 14,
    },

    twoColumns: {
      flexDirection: 'row',
      gap: 12,
    },

    column: {
      flex: 1,
    },

    statusSelector: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },

    statusOption: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#CFD8DC',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
    },

    statusOptionSelected: {
      borderColor: '#0D47A1',
      backgroundColor: '#E3F2FD',
    },

    statusOptionText: {
      color: '#607D8B',
      fontWeight: '600',
    },

    statusOptionTextSelected: {
      color: '#0D47A1',
      fontWeight: 'bold',
    },

    saveButton: {
      backgroundColor: '#0D47A1',
      borderRadius: 12,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },

    saveButtonDisabled: {
      opacity: 0.6,
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: 'bold',
    },

    cancelButton: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },

    cancelButtonText: {
      color: '#607D8B',
      fontWeight: '600',
    },
  });