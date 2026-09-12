import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';


interface Role {
  id: number;
  name: string;
  description?: string;
}


interface Employee {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: Role | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


interface EmployeeForm {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roleId: number | null;
  isActive: boolean;
}


const EMPTY_FORM: EmployeeForm = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',

  phone: '',
  password: '',
  roleId: null,
  isActive: true,
};


function getEmployeeName(
  employee: Employee,
) {
  const fullName = [
    employee.first_name,
    employee.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || employee.username;
}


function getApiErrorMessage(
  error: any,
  fallback: string,
) {
  const data = error?.response?.data;

  if (!data) {
    if (error?.code === 'ECONNABORTED') {
      return (
        'O servidor demorou para responder. ' +
        'Tente novamente.'
      );
    }

    return fallback;
  }

  if (
    typeof data.detail === 'string'
  ) {
    return data.detail;
  }

  if (
    typeof data === 'object'
  ) {
    const firstKey =
      Object.keys(data)[0];

    if (firstKey) {
      const value =
        data[firstKey];

      if (Array.isArray(value)) {
        return String(value[0]);
      }

      if (
        typeof value === 'string'
      ) {
        return value;
      }
    }
  }

  return fallback;
}


export default function EmployeesScreen() {
  const { user } = useAuth();


  const isAdministrator =
    user?.is_superuser === true ||
    user?.role?.name ===
      'Administrador';


  const [
    employees,
    setEmployees,
  ] = useState<Employee[]>([]);


  const [
    roles,
    setRoles,
  ] = useState<Role[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    modalVisible,
    setModalVisible,
  ] = useState(false);


  const [
    editingEmployee,
    setEditingEmployee,
  ] =
    useState<Employee | null>(
      null,
    );


  const [
    form,
    setForm,
  ] =
    useState<EmployeeForm>(
      EMPTY_FORM,
    );


  const loadData =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (!isAdministrator) {
          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          const [
            usersResponse,
            rolesResponse,
          ] =
            await Promise.all([
              api.get<Employee[]>(
                '/auth/users/',
              ),

              api.get<Role[]>(
                '/auth/roles/',
              ),
            ]);

          setEmployees(
            usersResponse.data,
          );

          setRoles(
            rolesResponse.data,
          );

        } catch (error) {
          console.error(
            'Erro ao carregar funcionários:',
            error,
          );

          Alert.alert(
            'Funcionários',
            getApiErrorMessage(
              error,
              'Não foi possível carregar os funcionários.',
            ),
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        isAdministrator,
      ],
    );


  useFocusEffect(
    useCallback(() => {
      loadData();

      return undefined;
    }, [
      loadData,
    ]),
  );


  function updateForm<
    K extends keyof EmployeeForm
  >(
    key: K,
    value: EmployeeForm[K],
  ) {
    setForm(
      current => ({
        ...current,
        [key]: value,
      }),
    );
  }


  function openCreateModal() {
    setEditingEmployee(null);

    setForm({
      ...EMPTY_FORM,
      roleId:
        roles.length > 0
          ? roles[0].id
          : null,
    });

    setModalVisible(true);
  }


  function openEditModal(
    employee: Employee,
  ) {
    setEditingEmployee(
      employee,
    );

    setForm({
      username:
        employee.username,

      firstName:
        employee.first_name ?? '',

      lastName:
        employee.last_name ?? '',

      email:
        employee.email ?? '',

    

      phone:
        employee.phone ?? '',

      password: '',

      roleId:
        employee.role?.id ??
        null,

      isActive:
        employee.is_active,
    });

    setModalVisible(true);
  }


  function closeModal() {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
  }


  function validateForm() {
    if (
      !form.username.trim()
    ) {
      Alert.alert(
        'Usuário',
        'Informe o nome de usuário.',
      );

      return false;
    }

    if (
      form.roleId === null
    ) {
      Alert.alert(
        'Perfil',
        'Selecione um perfil de acesso.',
      );

      return false;
    }

    if (
      !editingEmployee &&
      form.password.length < 8
    ) {
      Alert.alert(
        'Senha',
        'A senha deve possuir pelo menos 8 caracteres.',
      );

      return false;
    }

    if (
      editingEmployee &&
      form.password.length > 0 &&
      form.password.length < 8
    ) {
      Alert.alert(
        'Senha',
        'A nova senha deve possuir pelo menos 8 caracteres.',
      );

      return false;
    }

    return true;
  }


  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload: {
        username: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string | null;
        role_id: number;
        is_active: boolean;
        password?: string;
      } = {
        username:
          form.username.trim(),

        first_name:
          form.firstName.trim(),

        last_name:
          form.lastName.trim(),

        email:
          form.email.trim(),


        phone:
          form.phone.trim() ||
          null,

        role_id:
          form.roleId as number,

        is_active:
          form.isActive,
      };


      if (
        form.password.length > 0
      ) {
        payload.password =
          form.password;
      }


      if (editingEmployee) {
        await api.patch(
          `/auth/users/${editingEmployee.id}/`,
          payload,
        );

      } else {
        await api.post(
          '/auth/users/',
          payload,
        );
      }


      const wasEditing =
        Boolean(editingEmployee);

      setModalVisible(false);
      setEditingEmployee(null);
      setForm(EMPTY_FORM);

      await loadData(false);

      Alert.alert(
        'Sucesso',
        wasEditing
          ? 'Funcionário atualizado com sucesso.'
          : 'Funcionário cadastrado com sucesso.',
      );

    } catch (error) {
      console.error(
        'Erro ao salvar funcionário:',
        error,
      );

      Alert.alert(
        'Funcionários',
        getApiErrorMessage(
          error,
          'Não foi possível salvar o funcionário.',
        ),
      );

    } finally {
      setSaving(false);
    }
  }


  function confirmToggleActive(
    employee: Employee,
  ) {
    if (
      employee.id === user?.id
    ) {
      Alert.alert(
        'Conta administrativa',
        'Você não pode desativar sua própria conta por esta tela.',
      );

      return;
    }


    const newStatus =
      !employee.is_active;


    Alert.alert(
      newStatus
        ? 'Ativar funcionário'
        : 'Desativar funcionário',

      newStatus
        ? `Deseja ativar ${getEmployeeName(employee)}?`
        : `Deseja desativar ${getEmployeeName(employee)}?`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text:
            newStatus
              ? 'Ativar'
              : 'Desativar',

          style:
            newStatus
              ? 'default'
              : 'destructive',

          onPress: async () => {
            try {
              await api.patch(
                `/auth/users/${employee.id}/`,
                {
                  is_active:
                    newStatus,
                },
              );

              await loadData(
                false,
              );

            } catch (error) {
              Alert.alert(
                'Funcionários',
                getApiErrorMessage(
                  error,
                  'Não foi possível alterar o status do funcionário.',
                ),
              );
            }
          },
        },
      ],
    );
  }


  function confirmDelete(
    employee: Employee,
  ) {
    if (
      employee.id === user?.id
    ) {
      Alert.alert(
        'Conta administrativa',
        'Você não pode excluir sua própria conta.',
      );

      return;
    }


    Alert.alert(
      'Excluir funcionário',
      (
        `Deseja realmente excluir ` +
        `${getEmployeeName(employee)}?\n\n` +
        `Esta ação não pode ser desfeita.`
      ),

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text: 'Excluir',
          style: 'destructive',

          onPress: async () => {
            try {
              await api.delete(
                `/auth/users/${employee.id}/`,
              );

              await loadData(
                false,
              );

            } catch (error) {
              Alert.alert(
                'Funcionários',
                getApiErrorMessage(
                  error,
                  'Não foi possível excluir o funcionário.',
                ),
              );
            }
          },
        },
      ],
    );
  }


  function handleRefresh() {
    setRefreshing(true);
    loadData(false);
  }


  if (!isAdministrator) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.centerContainer
          }
        >
          <Text
            style={
              styles.accessDeniedTitle
            }
          >
            Acesso restrito
          </Text>

          <Text
            style={
              styles.accessDeniedText
            }
          >
            Apenas administradores podem
            gerenciar funcionários.
          </Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
      >

        <View
          style={styles.headerRow}
        >
          <View
            style={styles.headerText}
          >
            <Text
              style={styles.title}
            >
              Funcionários
            </Text>

            <Text
              style={styles.subtitle}
            >
              Cadastre e gerencie os
              acessos da equipe.
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.createButton
            }
            activeOpacity={0.8}
            onPress={
              openCreateModal
            }
          >
            <Text
              style={
                styles.createButtonText
              }
            >
              + Novo
            </Text>
          </TouchableOpacity>
        </View>


        {loading ? (
          <View
            style={
              styles.centerContainer
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
              Carregando funcionários...
            </Text>
          </View>

        ) : employees.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyTitle}
            >
              Nenhum funcionário
            </Text>

            <Text
              style={styles.emptyText}
            >
              Cadastre o primeiro
              funcionário da equipe.
            </Text>
          </View>

        ) : (
          employees.map(
            employee => {
              const isCurrentUser =
                employee.id ===
                user?.id;

              return (
                <View
                  key={employee.id}
                  style={
                    styles.employeeCard
                  }
                >

                  <View
                    style={
                      styles.employeeTop
                    }
                  >
                    <View
                      style={
                        styles.employeeInfo
                      }
                    >
                      <Text
                        style={
                          styles.employeeName
                        }
                      >
                        {getEmployeeName(
                          employee,
                        )}
                      </Text>

                      <Text
                        style={
                          styles.username
                        }
                      >
                        @{employee.username}
                      </Text>
                    </View>


                    <View
                      style={[
                        styles.statusBadge,

                        employee.is_active
                          ? styles.activeBadge
                          : styles.inactiveBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,

                          employee.is_active
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                      >
                        {employee.is_active
                          ? 'Ativo'
                          : 'Inativo'}
                      </Text>
                    </View>
                  </View>


                  <View
                    style={
                      styles.infoRow
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Perfil
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {employee.role?.name ??
                        'Sem perfil'}
                    </Text>
                  </View>


                  {!!employee.email && (
                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.infoLabel
                        }
                      >
                        E-mail
                      </Text>

                      <Text
                        style={
                          styles.infoValue
                        }
                      >
                        {employee.email}
                      </Text>
                    </View>
                  )}


                  {!!employee.phone && (
                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.infoLabel
                        }
                      >
                        Telefone
                      </Text>

                      <Text
                        style={
                          styles.infoValue
                        }
                      >
                        {employee.phone}
                      </Text>
                    </View>
                  )}


                  {isCurrentUser && (
                    <Text
                      style={
                        styles.currentUserText
                      }
                    >
                      Sua conta
                    </Text>
                  )}


                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.editButton,
                      ]}
                      onPress={() =>
                        openEditModal(
                          employee,
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


                    {!isCurrentUser && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,

                            employee.is_active
                              ? styles.disableButton
                              : styles.enableButton,
                          ]}
                          onPress={() =>
                            confirmToggleActive(
                              employee,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.secondaryActionText,

                              employee.is_active
                                ? styles.disableButtonText
                                : styles.enableButtonText,
                            ]}
                          >
                            {employee.is_active
                              ? 'Desativar'
                              : 'Ativar'}
                          </Text>
                        </TouchableOpacity>


                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.deleteButton,
                          ]}
                          onPress={() =>
                            confirmDelete(
                              employee,
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
                      </>
                    )}
                  </View>

                </View>
              );
            },
          )
        )}

      </ScrollView>


      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={
          closeModal
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalContainer}
          >
            <ScrollView
              contentContainerStyle={
                styles.modalContent
              }
              keyboardShouldPersistTaps="handled"
            >

              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalHeaderText
                  }
                >
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingEmployee
                      ? 'Editar funcionário'
                      : 'Novo funcionário'}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    {editingEmployee
                      ? 'Atualize os dados e permissões de acesso.'
                      : 'Cadastre um novo acesso ao AuditKM.'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    closeModal
                  }
                >
                  <Text
                    style={
                      styles.closeText
                    }
                  >
                    Fechar
                  </Text>
                </TouchableOpacity>
              </View>


              <Text
                style={styles.label}
              >
                Usuário *
              </Text>

              <TextInput
                style={styles.input}
                value={
                  form.username
                }
                onChangeText={
                  value =>
                    updateForm(
                      'username',
                      value,
                    )
                }
                autoCapitalize="none"
                placeholder="Ex.: joao.silva"
              />


              <Text
                style={styles.label}
              >
                Nome
              </Text>

              <TextInput
                style={styles.input}
                value={
                  form.firstName
                }
                onChangeText={
                  value =>
                    updateForm(
                      'firstName',
                      value,
                    )
                }
                placeholder="Nome"
              />


              <Text
                style={styles.label}
              >
                Sobrenome
              </Text>

              <TextInput
                style={styles.input}
                value={
                  form.lastName
                }
                onChangeText={
                  value =>
                    updateForm(
                      'lastName',
                      value,
                    )
                }
                placeholder="Sobrenome"
              />


              <Text
  style={styles.label}
>
  E-mail
</Text>

<TextInput
  style={styles.input}
  value={form.email}
  onChangeText={value =>
    updateForm(
      'email',
      value,
    )
  }
  keyboardType="email-address"
  autoCapitalize="none"
  placeholder="email@empresa.com"
/>

<Text
  style={styles.label}
>
  Telefone
</Text>

<TextInput
  style={styles.input}
  value={form.phone}
  onChangeText={value =>
    updateForm(
      'phone',
      value,
    )
  }
  keyboardType="phone-pad"
  placeholder="Telefone"
/>

<Text
  style={styles.label}
>
  Perfil de acesso *
</Text>
              <View
                style={
                  styles.rolesContainer
                }
              >
                {roles.map(
                  role => {
                    const selected =
                      form.roleId ===
                        role.id;

                    const ownAccount =
                      editingEmployee?.id ===
                        user?.id;

                    return (
                      <TouchableOpacity
                        key={role.id}
                        disabled={
                          ownAccount
                        }
                        style={[
                          styles.roleButton,

                          selected &&
                            styles.roleButtonSelected,

                          ownAccount &&
                            styles.disabledControl,
                        ]}
                        onPress={() =>
                          updateForm(
                            'roleId',
                            role.id,
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.roleButtonText,

                            selected &&
                              styles.roleButtonTextSelected,
                          ]}
                        >
                          {role.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>


              {editingEmployee?.id ===
                user?.id && (
                <Text
                  style={
                    styles.helperText
                  }
                >
                  O perfil da sua própria
                  conta não pode ser alterado.
                </Text>
              )}


              <Text
                style={styles.label}
              >
                {editingEmployee
                  ? 'Nova senha'
                  : 'Senha *'}
              </Text>

              <TextInput
                style={styles.input}
                value={
                  form.password
                }
                onChangeText={
                  value =>
                    updateForm(
                      'password',
                      value,
                    )
                }
                secureTextEntry
                autoCapitalize="none"
                placeholder={
                  editingEmployee
                    ? 'Deixe vazio para manter a senha atual'
                    : 'Mínimo de 8 caracteres'
                }
              />


              <View
                style={
                  styles.switchRow
                }
              >
                <View
                  style={
                    styles.switchTextArea
                  }
                >
                  <Text
                    style={
                      styles.switchTitle
                    }
                  >
                    Funcionário ativo
                  </Text>

                  <Text
                    style={
                      styles.switchDescription
                    }
                  >
                    Usuários inativos não
                    ficam disponíveis para
                    operação.
                  </Text>
                </View>

                <Switch
                  value={
                    form.isActive
                  }
                  disabled={
                    editingEmployee?.id ===
                      user?.id
                  }
                  onValueChange={
                    value =>
                      updateForm(
                        'isActive',
                        value,
                      )
                  }
                />
              </View>


              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                  ]}
                  disabled={saving}
                  onPress={
                    closeModal
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


                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.saveButton,

                    saving &&
                      styles.buttonDisabled,
                  ]}
                  disabled={saving}
                  onPress={
                    handleSave
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
                      Salvar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
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
    },

    headerRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },

    headerText: {
      flex: 1,
      paddingRight: 12,
    },

    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#263238',
    },

    subtitle: {
      color: '#607D8B',
      marginTop: 5,
      lineHeight: 20,
    },

    createButton: {
      backgroundColor: '#1565C0',
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 10,
    },

    createButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      minHeight: 300,
    },

    loadingText: {
      marginTop: 12,
      color: '#607D8B',
    },

    emptyCard: {
      backgroundColor: '#FFFFFF',
      padding: 24,
      borderRadius: 14,
      alignItems: 'center',
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#263238',
    },

    emptyText: {
      color: '#78909C',
      marginTop: 6,
      textAlign: 'center',
    },

    employeeCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 17,
      marginBottom: 13,
    },

    employeeTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
      marginBottom: 15,
    },

    employeeInfo: {
      flex: 1,
      paddingRight: 12,
    },

    employeeName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#263238',
    },

    username: {
      color: '#78909C',
      marginTop: 3,
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
      color: '#546E7A',
    },

    infoRow: {
      flexDirection: 'row',
      marginTop: 7,
    },

    infoLabel: {
      width: 75,
      color: '#90A4AE',
      fontSize: 12,
    },

    infoValue: {
      flex: 1,
      color: '#455A64',
      fontWeight: '500',
    },

    currentUserText: {
      marginTop: 12,
      color: '#1565C0',
      fontSize: 12,
      fontWeight: 'bold',
    },

    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 17,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#ECEFF1',
    },

    actionButton: {
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: 8,
      borderWidth: 1,
    },

    editButton: {
      backgroundColor: '#E3F2FD',
      borderColor: '#90CAF9',
    },

    editButtonText: {
      color: '#1565C0',
      fontWeight: 'bold',
    },

    disableButton: {
      backgroundColor: '#FFF8E1',
      borderColor: '#FFE082',
    },

    enableButton: {
      backgroundColor: '#E8F5E9',
      borderColor: '#A5D6A7',
    },

    secondaryActionText: {
      fontWeight: 'bold',
    },

    disableButtonText: {
      color: '#F57F17',
    },

    enableButtonText: {
      color: '#2E7D32',
    },

    deleteButton: {
      backgroundColor: '#FFEBEE',
      borderColor: '#EF9A9A',
    },

    deleteButtonText: {
      color: '#C62828',
      fontWeight: 'bold',
    },

    accessDeniedTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#C62828',
    },

    accessDeniedText: {
      marginTop: 8,
      textAlign: 'center',
      color: '#607D8B',
      lineHeight: 20,
    },

    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor:
        'rgba(0, 0, 0, 0.45)',
    },

    modalContainer: {
      maxHeight: '92%',
      backgroundColor: '#F4F6F8',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },

    modalContent: {
      padding: 20,
      paddingBottom: 35,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 12,
    },

    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#263238',
    },

    modalSubtitle: {
      color: '#78909C',
      marginTop: 5,
      lineHeight: 19,
    },

    closeText: {
      color: '#1565C0',
      fontWeight: 'bold',
      paddingVertical: 4,
    },

    label: {
      color: '#455A64',
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 12,
    },

    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CFD8DC',
      borderRadius: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      color: '#263238',
    },

    rolesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    roleButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#CFD8DC',
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },

    roleButtonSelected: {
      backgroundColor: '#1565C0',
      borderColor: '#1565C0',
    },

    roleButtonText: {
      color: '#455A64',
      fontWeight: '600',
    },

    roleButtonTextSelected: {
      color: '#FFFFFF',
    },

    disabledControl: {
      opacity: 0.6,
    },

    helperText: {
      color: '#78909C',
      marginTop: 7,
      fontSize: 12,
    },

    switchRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginTop: 22,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 15,
    },

    switchTextArea: {
      flex: 1,
      paddingRight: 12,
    },

    switchTitle: {
      color: '#263238',
      fontWeight: 'bold',
    },

    switchDescription: {
      color: '#78909C',
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
    },

    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 25,
    },

    modalButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButton: {
      backgroundColor: '#ECEFF1',
    },

    cancelButtonText: {
      color: '#455A64',
      fontWeight: 'bold',
    },

    saveButton: {
      backgroundColor: '#1565C0',
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    buttonDisabled: {
      opacity: 0.6,
    },
  });